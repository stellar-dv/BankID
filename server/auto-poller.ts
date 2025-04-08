import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';
import { getBankidClient } from './bankid';
import logger from './logger';

// Active polling sessions map: orderRef -> timer ID
const activePollers = new Map<string, any>();
const MAX_POLLING_TIME = 90000; // 90 seconds timeout (BankID standard timeout)
const POLLING_INTERVAL = 2000; // 2 seconds between each poll

// Helper function to send webhook callback
type CallbackSender = (callbackUrl: string, data: any) => Promise<boolean>;

/**
 * Start automatic polling for a BankID order
 * 
 * @param orderRef The order reference to poll
 * @param maxTime Maximum time to poll in milliseconds
 * @param interval Polling interval in milliseconds
 * @param sendCallback Function to call when sending callbacks
 */
export function startAutoPolling(
  orderRef: string, 
  maxTime: number = MAX_POLLING_TIME, 
  interval: number = POLLING_INTERVAL,
  sendCallback: CallbackSender
) {
  // Generate a unique ID for this polling session
  const pollingId = uuidv4();
  
  // If this orderRef is already being polled, clear the existing interval
  if (activePollers.has(orderRef)) {
    clearInterval(activePollers.get(orderRef));
    logger.log(`🔄 Restarting auto polling for orderRef: ${orderRef}`, 'poller');
  } else {
    logger.log(`▶️ Starting auto polling for orderRef: ${orderRef}`, 'poller');
  }
  
  let elapsedTime = 0;
  
  // Create the interval timer for polling
  const timerId = setInterval(async () => {
    try {
      elapsedTime += interval;
      
      // Get the BankID client
      const bankidClient = getBankidClient();
      
      // Get session from database to check its current status
      const session = await storage.getBankidSessionByOrderRef(orderRef);
      
      // If session doesn't exist or is already complete/failed, stop polling
      if (!session || session.status === 'complete' || session.status === 'failed') {
        logger.log(`⏹️ Auto polling stopped for orderRef: ${orderRef} (Session ${!session ? 'not found' : 'already ' + session.status})`, 'poller');
        clearInterval(timerId);
        activePollers.delete(orderRef);
        return;
      }
      
      // Collect status from BankID API
      logger.log(`🔍 Auto polling collecting status for orderRef: ${orderRef}`, 'poller');
      const response = await bankidClient.collect({ orderRef });
      
      logger.logBankIdEvent('poll-collect', response);
      
      // Handle the response based on status
      if (response.status === 'complete') {
        logger.log(`✅ Auto polling: BankID session completed for orderRef: ${orderRef}`, 'poller');
        await storage.completeBankidSessionByOrderRef(orderRef);
        
        // If the session has a callback URL, send a completion notification
        if (session.callbackUrl) {
          await sendCallback(session.callbackUrl, {
            status: 'complete',
            orderRef,
            operation: 'bankid',
            completionData: response.completionData,
            timestamp: new Date().toISOString()
          });
        }
        
        // Stop polling as we're done
        clearInterval(timerId);
        activePollers.delete(orderRef);
      } else if (response.status === 'failed') {
        logger.warn(`❌ Auto polling: BankID session failed for orderRef: ${orderRef}, hint: ${response.hintCode}`, 'poller');
        await storage.updateBankidSessionStatusByOrderRef(orderRef, 'failed');
        
        // If the session has a callback URL, send a failure notification
        if (session.callbackUrl) {
          await sendCallback(session.callbackUrl, {
            status: 'failed',
            orderRef,
            operation: 'bankid',
            hintCode: response.hintCode,
            timestamp: new Date().toISOString()
          });
        }
        
        // Stop polling as we're done
        clearInterval(timerId);
        activePollers.delete(orderRef);
      } else {
        // Session is still pending, update status and continue polling
        await storage.updateBankidSessionStatusByOrderRef(orderRef, response.status);
        logger.log(`⏳ Auto polling: BankID session status ${response.status} for orderRef: ${orderRef}`, 'poller');
      }
      
      // If we've exceeded the maximum polling time, cancel polling
      if (elapsedTime >= maxTime) {
        logger.warn(`⏱️ Auto polling: Timeout reached for orderRef: ${orderRef}`, 'poller');
        
        // Try to cancel the BankID order
        try {
          await bankidClient.cancel({ orderRef });
          logger.log(`🛑 Auto polling: BankID order cancelled for orderRef: ${orderRef}`, 'poller');
        } catch (error) {
          logger.error(`🔴 Auto polling: Failed to cancel BankID order for orderRef: ${orderRef}`, 'poller');
        }
        
        // Update session status and stop polling
        await storage.updateBankidSessionStatusByOrderRef(orderRef, 'failed');
        
        // Send callback notification if applicable
        if (session.callbackUrl) {
          await sendCallback(session.callbackUrl, {
            status: 'timeout',
            orderRef,
            operation: 'bankid',
            timestamp: new Date().toISOString()
          });
        }
        
        clearInterval(timerId);
        activePollers.delete(orderRef);
      }
    } catch (error: any) {
      logger.error(`🔴 Auto polling error for orderRef: ${orderRef}: ${error.message}`, 'poller');
      
      // If this is a critical error, stop polling
      if (error.httpStatus >= 500 || elapsedTime >= maxTime) {
        clearInterval(timerId);
        activePollers.delete(orderRef);
        
        // Get session to check if we need to send a callback
        try {
          const session = await storage.getBankidSessionByOrderRef(orderRef);
          if (session && session.callbackUrl) {
            await sendCallback(session.callbackUrl, {
              status: 'error',
              orderRef,
              operation: 'bankid',
              errorMessage: error.details || error.message,
              timestamp: new Date().toISOString()
            });
          }
        } catch (cbError) {
          logger.error(`🔴 Auto polling: Failed to send error callback for orderRef: ${orderRef}`, 'poller');
        }
      }
    }
  }, interval);
  
  // Store the timer ID with orderRef as key
  activePollers.set(orderRef, timerId);
  
  return pollingId;
}

/**
 * Stop an active polling session
 * 
 * @param orderRef The order reference to stop polling for
 */
export function stopAutoPolling(orderRef: string) {
  if (activePollers.has(orderRef)) {
    clearInterval(activePollers.get(orderRef));
    activePollers.delete(orderRef);
    logger.log(`⏹️ Auto polling manually stopped for orderRef: ${orderRef}`, 'poller');
    return true;
  }
  return false;
}

/**
 * Check if an order is being actively polled
 * 
 * @param orderRef The order reference to check
 */
export function isOrderBeingPolled(orderRef: string): boolean {
  return activePollers.has(orderRef);
}

/**
 * Get statistics about active polling sessions
 */
export function getPollingStats() {
  return {
    activePollers: activePollers.size,
    orderRefs: Array.from(activePollers.keys())
  };
}
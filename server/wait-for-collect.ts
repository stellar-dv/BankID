import { getBankidClient } from './bankid';
import { storage } from './storage';
import logger, { logBankIdEvent, fancyLog, fancyWarn, fancyError } from './logger';

/**
 * Validates that an orderRef is in the correct format
 * 
 * @param orderRef The BankID order reference to validate
 * @returns True if the orderRef appears valid
 */
function isValidOrderRef(orderRef: string): boolean {
  // BankID order references follow a specific format
  // They should match a UUID-like pattern (example: 019616aa-8dbd-7b06-a98d-35df64a23f40)
  const orderRefPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  
  if (!orderRef || typeof orderRef !== 'string') {
    return false;
  }
  
  return orderRefPattern.test(orderRef);
}

/**
 * Function to wait for BankID collection to complete or fail
 * 
 * @param orderRef The BankID order reference to poll
 * @param maxWaitTime Maximum time to wait for completion in milliseconds
 * @returns The collect response or a timeout/error object
 */
export async function waitForCollect(orderRef: string, maxWaitTime = 90000): Promise<any> {
  // Get the BankID client
  const bankidClient = getBankidClient();
  
  // Validate the orderRef before proceeding
  if (!isValidOrderRef(orderRef)) {
    fancyError(`❌ Invalid orderRef format: ${orderRef}`, 'collection');
    return {
      status: 'failed',
      orderRef,
      hintCode: 'invalidParameters',
      message: 'The orderRef provided is not in a valid format'
    };
  }
  
  // Check if the order exists in our storage
  const session = await storage.getBankidSessionByOrderRef(orderRef);
  if (!session) {
    fancyError(`❌ Session not found for orderRef: ${orderRef}`, 'collection');
    return {
      status: 'failed',
      orderRef,
      hintCode: 'notFound',
      message: 'No BankID session found for the specified orderRef'
    };
  }
  
  fancyLog(`⏳ Waiting for collect result for orderRef: ${orderRef}`, 'collection');
  
  // Keep track of start time to enforce timeout
  const startTime = Date.now();
  let completed = false;
  let result = null;
  
  // Poll until completed, failed, or timeout
  while (!completed && (Date.now() - startTime) < maxWaitTime) {
    try {
      // Collect the current status
      // Make sure we're sending the orderRef in the correct format
      if (!orderRef) {
        throw new Error('orderRef is required');
      }
      
      // Log the request we're about to make for debugging
      fancyLog(`🔍 Sending collect request with orderRef: ${orderRef}`, 'collection');
      
      // The BankID library expects an object with orderRef property
      const collectRequest = { orderRef };
      const collectResponse = await bankidClient.collect(collectRequest);
      logBankIdEvent('wait-collect', collectResponse);
      
      // Update session status based on BankID response
      if (collectResponse.status === 'complete') {
        await storage.completeBankidSessionByOrderRef(orderRef);
        fancyLog(`✅ BankID session completed for orderRef: ${orderRef}`, 'collection');
        completed = true;
        result = collectResponse;
      } else if (collectResponse.status === 'failed') {
        await storage.updateBankidSessionStatusByOrderRef(orderRef, 'failed');
        fancyWarn(`❌ BankID session failed for orderRef: ${orderRef}, hint: ${collectResponse.hintCode}`, 'collection');
        completed = true;
        result = collectResponse;
      } else {
        // Update status and continue waiting
        await storage.updateBankidSessionStatusByOrderRef(orderRef, collectResponse.status);
        fancyLog(`⏳ BankID session status ${collectResponse.status} for orderRef: ${orderRef}`, 'collection');
      }
      
      // If not completed, wait a bit before trying again
      if (!completed) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error: any) {
      // Log detailed error information
      fancyError(`🔴 Error while waiting for collect: ${error.message}`, 'collection');
      
      if (error.name) {
        fancyError(`  Error name: ${error.name}`, 'collection');
      }
      
      if (error.code) {
        fancyError(`  Error code: ${error.code}`, 'collection');
      }
      
      if (error.details) {
        fancyError(`  Error details: ${JSON.stringify(error.details)}`, 'collection');
      }
      
      // Special handling for "No such order" error - this occurs when the order
      // has already been completed or has expired on the BankID server
      if (error.code === 'invalidParameters' || 
          (error.details && typeof error.details === 'string' && 
           (error.details.includes('No such order') || error.details.includes('invalid') || error.details.includes('expired')))) {
        
        // This might be a race condition where another thread just marked the session as complete
        // First check if it was marked as complete in our database (by auto-poller for example)
        const updatedSession = await storage.getBankidSessionByOrderRef(orderRef);
        
        // If the session was marked as completed in our database, consider this a success
        if (updatedSession && updatedSession.status === 'complete') {
          fancyLog(`✅ Order already completed in database for orderRef: ${orderRef}`, 'collection');
          
          // If our storage has completion data, return it instead of the error
          // This allows us to return a proper completion response even when the BankID order is no longer available
          // This is especially useful right after completion when there's a race condition
          let completionData = updatedSession.completionData || {};
          
          // Mark as completed with success to exit the loop
          completed = true;
          result = {
            status: 'complete',
            orderRef,
            hintCode: 'orderAlreadyCompleted',
            message: 'The BankID session was already completed successfully',
            completionData
          };
          
          continue; // Skip to next iteration (which will exit the loop since completed=true)
        }
        
        // If we get here, the order is invalid or expired, not a successful completion
        fancyError(`  Invalid parameter error detected, possibly expired or completed orderRef: ${orderRef}`, 'collection');
        
        // Determine the appropriate status
        let responseStatus = 'failed';
        let hintCode = 'invalidParameters';
        let message = 'The BankID session has expired or was already completed';
        
        // Mark as completed with failure to exit the loop
        completed = true;
        result = {
          status: responseStatus,
          orderRef,
          hintCode,
          message
        };
        
        // Update the session status to failed if it exists and isn't already marked as complete
        if (updatedSession && updatedSession.status !== 'complete') {
          await storage.updateBankidSessionStatusByOrderRef(orderRef, 'failed');
        }
        
        continue; // Skip to next iteration (which will exit the loop since completed=true)
      }
      
      // Only throw critical errors, for others keep trying
      if (error.httpStatus >= 500) {
        throw error;
      }
      
      // Wait a bit before retrying after error
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  if (!completed) {
    // If we reach here and not completed, we timed out
    fancyWarn(`⏱️ Timeout reached while waiting for orderRef: ${orderRef}`, 'collection');
    
    // Update session status to failed
    await storage.updateBankidSessionStatusByOrderRef(orderRef, 'failed');
    
    // Return timeout result
    return {
      status: 'timeout',
      orderRef,
      message: 'Operation timed out after waiting for the maximum allowed time'
    };
  }
  
  return result;
}
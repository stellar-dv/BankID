export default function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 py-4 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-slate-400">
          <div className="mb-3 sm:mb-0">
            <p>© {new Date().getFullYear()} BankID Security Service</p>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

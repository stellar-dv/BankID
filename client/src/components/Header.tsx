import BankIDLogo from "@/assets/bankid-logo";

export default function Header() {
  return (
    <header className="bg-slate-900 border-b border-slate-800 py-4">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div className="flex items-center">
          <BankIDLogo width={32} height={32} color="#ffffff" />
          <span className="ml-2 text-lg font-semibold text-white">Apotea AB (Demo)</span>
        </div>
        <div className="flex items-center space-x-4">
          <button className="text-slate-300 hover:text-primary text-sm font-medium">
            Help
          </button>
          <div className="h-4 border-r border-slate-700"></div>
          <button className="text-slate-300 hover:text-primary text-sm font-medium">
            Svenska
          </button>
        </div>
      </div>
    </header>
  );
}

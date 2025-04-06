import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BankIDFlow from "@/components/BankIDFlow";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <Header />
      <main className="flex-grow flex items-center justify-center py-8 px-4">
        <BankIDFlow />
      </main>
      <Footer />
    </div>
  );
}

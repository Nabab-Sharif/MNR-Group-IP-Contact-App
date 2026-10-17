const Footer = () => {
  return (
    <footer className="w-full border-t border-slate-700/80 bg-gradient-to-r from-slate-900 to-slate-800 text-slate-300 dark:from-slate-950 dark:to-slate-900">
      <div className="flex min-h-[72px] items-center justify-center px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-center text-sm">
          <span className="font-semibold text-slate-200">Developed by</span>
          <span className="font-bold text-blue-400">MNR Group IT Team</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

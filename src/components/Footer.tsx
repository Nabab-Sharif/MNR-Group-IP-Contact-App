const Footer = () => {
  return (
    <footer className="w-full bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 text-slate-300 border-t border-slate-700 mt-12">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-200">Developed by</span>
              <span className="text-sm font-bold text-blue-400">MNR Group IT Team</span>
            </div>
        
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

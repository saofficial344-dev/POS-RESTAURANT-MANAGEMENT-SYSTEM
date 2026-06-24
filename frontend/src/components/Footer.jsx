const Footer = () => {
  return (
    <footer className="w-full bg-white border-t border-gray-200">

      <div className="max-w-7xl mx-auto px-5 py-3 flex flex-col md:flex-row items-center justify-between gap-4">

        {/* LEFT */}
        <div className="text-center md:text-left">

          <h2 className="text-sm font-bold tracking-wide text-gray-900">
            POS SYSTEM
          </h2>

          <p className="text-[11px] text-gray-500 mt-0.5">
            Restaurant Management Dashboard
          </p>

        </div>

        {/* CENTER STATUS */}
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">

          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>

          <p className="text-[11px] text-green-600 font-medium">
            System Online
          </p>

        </div>

        {/* RIGHT */}
        <div className="text-center md:text-right">

          <p className="text-[11px] font-medium text-gray-900">
            ShahnaynLabs © {new Date().getFullYear()}
          </p>

          <p className="text-[10px] text-gray-500">
            Built for modern restaurant operations
          </p>

        </div>

      </div>

    </footer>
  );
};

export default Footer;
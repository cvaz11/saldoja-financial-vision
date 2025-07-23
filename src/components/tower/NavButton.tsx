interface NavButtonProps {
  href: string;
  icon: string;
  title: string;
  description: string;
  bgGradient: string;
  iconBg: string;
  hoverColor: string;
}

const NavButton = ({ href, icon, title, description, bgGradient, iconBg, hoverColor }: NavButtonProps) => (
  <a 
    href={href}
    className={`block p-6 rounded-xl border-2 border-gray-200 ${hoverColor} hover:shadow-lg transition-all duration-300 group relative overflow-hidden`}
  >
    {/* Gradient background */}
    <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} opacity-30`} />
    
    <div className="relative z-10 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${iconBg} text-white group-hover:scale-110 transition-transform shadow-lg`}>
        <span className="text-xl">{icon}</span>
      </div>
      <div>
        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-lg">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
    </div>
  </a>
);

export default NavButton;
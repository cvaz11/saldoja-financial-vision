interface NavButtonProps {
  href: string;
  icon: string;
  title: string;
  description: string;
  bgColor: string;
  iconColor: string;
}

const NavButton = ({ href, icon, title, description, bgColor, iconColor }: NavButtonProps) => (
  <a 
    href={href}
    className="block p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all group"
  >
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-lg ${bgColor} group-hover:scale-110 transition-transform`}>
        <span className={`text-xl ${iconColor}`}>{icon}</span>
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  </a>
);

export default NavButton;
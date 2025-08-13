import React from "react";
import { MdOutlineChat } from "react-icons/md";
import { RiImageCircleAiFill } from "react-icons/ri";
import { GoGear } from "react-icons/go";
import { CgProfile } from "react-icons/cg";
import Button from "./Button";

type TabType = "chat" | "status" | "setting" | "profile";

type Props = {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  isHorizontal?: boolean;
};

const Sidebar = ({ currentTab, onTabChange, isHorizontal = false }: Props) => {
  const topItems = [
    { id: "chat" as const, icon: <MdOutlineChat size={24} />, label: "Chat" },
    {
      id: "status" as const,
      icon: <RiImageCircleAiFill size={24} />,
      label: "Status",
    },
  ];

  const bottomItems = [
    { id: "setting" as const, icon: <GoGear size={24} />, label: "Settings" },
    { id: "profile" as const, icon: <CgProfile size={24} />, label: "Profile" },
  ];

  return (
    <aside
      className={`dark:bg-gray-900 bg-neutral-100 ${
        isHorizontal
          ? "flex flex-row justify-around items-center h-16 border-t dark:border-gray-800 border-gray-300"
          : "flex flex-col h-full w-20 border-r dark:border-gray-800 border-gray-300"
      }`}
      role="navigation"
      aria-label="Main navigation"
    >
      {isHorizontal ? (
        // Horizontal layout for mobile
        <nav className="flex justify-around items-center w-full px-4">
          {[...topItems, ...bottomItems].map((item) => (
            <Button
              key={item.id}
              className="rounded-full"
              variant="icon"
              isActive={currentTab === item.id}
              onClick={() => onTabChange(item.id)}
              aria-label={item.label}
              title={item.label}
            >
              {item.icon}
            </Button>
          ))}
        </nav>
      ) : (
        // Vertical layout for desktop
        <nav className="flex flex-col justify-between h-full py-6">
          <div className="flex flex-col items-center space-y-4">
            {topItems.map((item) => (
              <Button
                key={item.id}
                className="rounded-full"
                variant="icon"
                isActive={currentTab === item.id}
                onClick={() => onTabChange(item.id)}
                aria-label={item.label}
                title={item.label}
              >
                {item.icon}
              </Button>
            ))}
          </div>

          <div className="flex flex-col items-center space-y-4">
            {bottomItems.map((item) => (
              <Button
                key={item.id}
                className="rounded-full"
                variant="icon"
                isActive={currentTab === item.id}
                onClick={() => onTabChange(item.id)}
                aria-label={item.label}
                title={item.label}
              >
                {item.icon}
              </Button>
            ))}
          </div>
        </nav>
      )}
    </aside>
  );
};

export default Sidebar;

import React from "react";
import { classNames } from "../../utils";

interface GroupAvatarProps {
  participants: { avatar: { url: string } }[];
  size: number; // e.g. 64
}

const GroupAvatar: React.FC<GroupAvatarProps> = ({ participants, size }) => {
  const displayed = participants.slice(0, 2);
  const extra = participants.length - displayed.length;
  const overlapOffset = size * 0.35;
  const totalWidth = size + (displayed.length - 1) * overlapOffset;

  return (
    <div className="relative" style={{ width: totalWidth, height: size }}>
      {displayed.map((p, i) => (
        <img
          key={i}
          src={p.avatar?.url}
          alt={`Member ${i + 1}`}
          style={{
            width: size,
            height: size,
            left: i * overlapOffset,
          }}
          className={classNames(
            "absolute rounded-full object-cover border-2 border-white dark:border-darkBg",
            `z-[${30 - i}]`,
          )}
        />
      ))}

      {extra > 0 && (
        <div
          style={{
            width: size,
            height: size,
            left: displayed.length * overlapOffset,
          }}
          className="absolute rounded-full bg-gray-500 text-white text-sm font-medium flex items-center justify-center border-2 border-white dark:border-darkBg"
        >
          +{extra}
        </div>
      )}
    </div>
  );
};

export default GroupAvatar;

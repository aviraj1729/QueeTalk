import React from "react";
import type { User } from "../types/chat";

// Dummy status data
type Status = {
  id: string;
  user: User;
  time: string;
  text: string;
};

const dummyStatuses: Status[] = [
  {
    id: "1",
    user: { id: "u1", name: "Alice", avatar: "👩" },
    time: "Just now",
    text: "Working on a new project!",
  },
  {
    id: "2",
    user: { id: "u2", name: "Bob", avatar: "👨" },
    time: "5 mins ago",
    text: "Listening to music 🎧",
  },
];

const StatusPage = () => {
  return (
    <div className="h-full overflow-y-auto p-4 bg-gray-50">
      <h1 className="text-xl font-bold mb-4">Status Updates</h1>
      <div className="space-y-4">
        {dummyStatuses.map((status) => (
          <div
            key={status.id}
            className="flex items-start gap-4 bg-white p-4 rounded-lg shadow"
          >
            <div className="text-3xl">{status.user.avatar}</div>
            <div>
              <div className="font-semibold">{status.user.name}</div>
              <div className="text-sm text-gray-500">{status.time}</div>
              <div className="mt-1 text-gray-700">{status.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatusPage;

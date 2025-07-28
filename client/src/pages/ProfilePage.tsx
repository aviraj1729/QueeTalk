// src/components/ProfilePage.tsx
import React from "react";

const dummyProfile = {
  name: "Avi Raj",
  email: "aviraj1729@gmail.com",
  contact: "+91-70501-88600",
  bio: "Building Chatty 🚀 | React & Node.js Dev",
  avatar: "https://api.dicebear.com/7.x/thumbs/svg?seed=avi",
};

const ProfilePage = () => {
  return (
    <div className="h-full overflow-y-auto p-6 bg-gray-50">
      <h1 className="text-2xl font-bold mb-6">👤 My Profile</h1>

      <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto">
        <div className="flex items-center justify-center mb-6">
          <img
            src={dummyProfile.avatar}
            alt="Avatar"
            className="w-24 h-24 rounded-full border-2 border-gray-300"
          />
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-500">Name</label>
            <div className="text-lg font-semibold">{dummyProfile.name}</div>
          </div>

          <div>
            <label className="text-sm text-gray-500">Email</label>
            <div className="text-lg font-semibold">{dummyProfile.email}</div>
          </div>

          <div>
            <label className="text-sm text-gray-500">Contact</label>
            <div className="text-lg font-semibold">{dummyProfile.contact}</div>
          </div>

          <div>
            <label className="text-sm text-gray-500">Bio</label>
            <div className="text-md text-gray-700 italic">
              {dummyProfile.bio}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

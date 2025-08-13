import React, { useCallback, useState, useEffect, useRef } from "react";
import { CgProfile } from "react-icons/cg";
import { MdOutlineEdit, MdCheck } from "react-icons/md";
import { getInitials, requestHandler } from "../utils";
import { currentUser } from "../api";

const EditableField = ({
  label,
  value,
  onSave,
  editable = true,
}: {
  label: string;
  value: string;
  onSave: (newVal: string) => void;
  editable?: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleSave = () => {
    onSave(draft);
    setIsEditing(false);
  };

  return (
    <div className="w-full mb-4">
      <span className="block text-base text-gray-500">{label}</span>
      <div className="w-full flex items-center justify-between gap-2">
        <input
          type="text"
          value={isEditing ? draft : value}
          onChange={(e) => setDraft(e.target.value)}
          readOnly={!isEditing}
          className={`flex-grow text-xl bg-transparent outline-none border-b px-2 py-1 ${
            isEditing ? "border-gray-600 rounded" : "border-none"
          }`}
        />
        {editable && (
          <>
            {isEditing ? (
              <button onClick={handleSave} className="text-green-500">
                <MdCheck size={20} />
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="text-gray-400 rounded-full p-2 hover:bg-gray-700"
              >
                <MdOutlineEdit size={20} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const [data, setData] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Add ref for dropdown container
  const dropdownRef = useRef(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [contact, setContact] = useState("");

  const getUser = useCallback(async () => {
    await requestHandler(
      currentUser,
      null,
      (response) => {
        const { data } = response;
        setData(data || null);
      },
      (error) => {
        alert(error);
      },
    );
  }, []);

  useEffect(() => {
    getUser();
  }, [getUser]);

  // When `data` changes, populate the field states
  useEffect(() => {
    if (data) {
      setName(data.name || "");
      setUsername(data.username || "");
      setEmail(data.email || "");
      setContact(data.contact || "");
      setDob(
        new Date(data.dateOfBirth).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      );
    }
  }, [data]);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const response = await updateAvatar(file); // call your function
      getUser(); // refresh user data
    } catch (err) {
      alert("Failed to upload avatar");
    }
  };

  const handleAvatarDelete = async () => {
    try {
      await apiClient.delete("/auth/avatar"); // replace with actual endpoint
      getUser(); // refresh avatar
    } catch (err) {
      alert("Failed to delete avatar");
    }
  };

  const toggleDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Dropdown clicked, current state:", showDropdown); // Debug log
    setShowDropdown((prev) => !prev);
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-gray-900 text-white">
      <div className="w-fit p-6 border-r border-gray-700 flex flex-col items-center">
        <h2 className="text-3xl font-bold mb-6 self-start">Profile</h2>

        {/* Avatar container with better positioning */}
        <div className="relative w-32 h-32 mb-6" ref={dropdownRef}>
          {/* Avatar image or initials */}
          <div className="w-full h-full rounded-full overflow-hidden outline outline-1 outline-gray-500 group relative">
            {data?.avatar?.url ? (
              <img
                src={data.avatar.url}
                alt={getInitials(name)}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-gray-300 dark:bg-gray-700 text-white flex items-center justify-center text-7xl font-bold">
                {getInitials(name)}
              </div>
            )}

            {/* Overlay on hover - make it more reliable */}
            <div
              className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
              onClick={toggleDropdown}
            >
              <span className="text-white text-xs font-semibold text-center px-2">
                Change Profile Picture
              </span>
            </div>
          </div>

          {/* Dropdown below avatar - improved positioning and z-index */}
          {showDropdown && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 rounded-md shadow-xl border z-[9999]">
              <ul className="text-sm py-1">
                <li
                  className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                  onClick={() => {
                    if (data?.avatar?.url) {
                      window.open(data.avatar.url, "_blank");
                    }
                    setShowDropdown(false);
                  }}
                >
                  View Photo
                </li>
                <li
                  className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                  onClick={() => {
                    alert("Camera not implemented");
                    setShowDropdown(false);
                  }}
                >
                  Take Photo
                </li>
                <li className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100">
                  <label className="cursor-pointer w-full h-full block">
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        setShowDropdown(false);
                        handleAvatarUpload(e);
                      }}
                      className="hidden"
                    />
                  </label>
                </li>
                <li
                  className="px-4 py-3 hover:bg-gray-100 text-red-500 cursor-pointer"
                  onClick={() => {
                    handleAvatarDelete();
                    setShowDropdown(false);
                  }}
                >
                  Delete Photo
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="w-full space-y-6">
          <EditableField label="Name" value={name} onSave={setName} />
          <EditableField
            label="Username"
            value={username}
            onSave={setUsername}
          />
          <EditableField label="Contact" value={contact} onSave={setContact} />
          <EditableField
            label="E-mail"
            value={email}
            onSave={() => {}}
            editable={false}
          />
          <EditableField
            label="DOB"
            value={dob}
            onSave={() => {}}
            editable={false}
          />
        </div>
      </div>

      <div className="md:flex hidden flex-grow flex-col justify-center items-center">
        <CgProfile size={64} className="text-gray-500" />
        <p className="text-4xl font-bold mt-4">Profile</p>
      </div>
    </div>
  );
};

export default ProfilePage;

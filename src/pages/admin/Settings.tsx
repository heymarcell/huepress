import { useUser } from "@clerk/clerk-react";

export default function AdminSettings() {
  const { user } = useUser();

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-h2 text-ink">Settings</h1>
        <p className="text-gray-500">Manage your admin profile and configuration.</p>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/60 p-8 space-y-8">
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-ink">My Profile</h2>
          <div className="flex items-center gap-4">
            <img 
              src={user?.imageUrl} 
              alt="Avatar" 
              className="w-16 h-16 rounded-full border-2 border-white shadow-sm"
            />
            <div>
              <p className="font-medium text-ink">{user?.fullName}</p>
              <p className="text-sm text-gray-500">{user?.primaryEmailAddress?.emailAddress}</p>
              <span className="inline-block mt-2 px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-md">
                Administrator
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
            <h2 className="text-lg font-bold text-ink mb-4">Application Settings</h2>
            <p className="text-gray-500 text-sm">Global configuration settings will appear here.</p>
        </div>
      </div>
    </div>
  );
}

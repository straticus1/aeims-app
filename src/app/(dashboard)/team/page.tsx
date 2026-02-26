"use client";

import { useState, useEffect } from "react";
import { Users, UserPlus, Mail, Shield, MoreVertical } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface TeamMember {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  avatarUrl?: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

const roleColors: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-800",
  ADMIN: "bg-blue-100 text-blue-800",
  MEMBER: "bg-green-100 text-green-800",
  VIEWER: "bg-gray-100 text-gray-800",
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch("/api/team");
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Team"
        subtitle={`${members.filter(m => m.isActive).length} active members`}
        actions={
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        }
      />

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Users className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No team members</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by inviting your first team member.
            </p>
            <div className="mt-6">
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-white overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="w-12 px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name || member.email}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                            <Users className="h-5 w-5 text-gray-600" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {member.displayName || member.name || "Unknown"}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          roleColors[member.role]
                        )}
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          member.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        )}
                      >
                        <span
                          className={cn(
                            "mr-1.5 h-1.5 w-1.5 rounded-full",
                            member.isActive ? "bg-green-500" : "bg-red-500"
                          )}
                        />
                        {member.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {member.lastLoginAt
                          ? new Date(member.lastLoginAt).toLocaleString()
                          : "Never"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

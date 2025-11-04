import { useQuery } from "@tanstack/react-query";
import { TopAppBar } from "@/components/ui/top-app-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Users, UserPlus, Mail } from "lucide-react";
import type { User, Certification } from "@shared/schema";

interface StaffWithCertification extends User {
  certification?: Certification | null;
}

export function StaffManagement() {
  const { data: staffList, isLoading } = useQuery<StaffWithCertification[]>({
    queryKey: ["/api/manager/staff"],
  });

  const getDaysUntilExpiration = (expiresAt: Date | string | null | undefined) => {
    if (!expiresAt) return null;
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopAppBar title="Staff Management" />

      <div className="px-4 py-6 max-w-7xl mx-auto space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Staff Roster</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {staffList?.length || 0} staff members
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              data-testid="button-invite-staff"
            >
              <Mail className="w-4 h-4 mr-2" />
              Invite
            </Button>
            <Button
              size="sm"
              data-testid="button-add-staff"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </div>
        </div>

        {/* Staff List */}
        <Card data-testid="section-staff-list">
          <CardHeader>
            <CardTitle>All Staff Members</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : !staffList || staffList.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-base font-medium">No Staff Members Yet</p>
                <p className="text-sm mt-2">Invite your first staff member to get started</p>
                <Button className="mt-6" data-testid="button-invite-first-staff">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Staff Member
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {staffList.map((staff) => {
                  const cert = staff.certification;
                  const daysUntilExp = getDaysUntilExpiration(cert?.expiresAt);
                  
                  return (
                    <Card
                      key={staff.id}
                      className="hover-elevate"
                      data-testid={`staff-card-${staff.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          {staff.profileImageUrl ? (
                            <img
                              src={staff.profileImageUrl}
                              alt={`${staff.firstName} ${staff.lastName}`}
                              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm flex-shrink-0">
                              {staff.firstName?.[0]}{staff.lastName?.[0]}
                            </div>
                          )}

                          {/* Staff Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <h3 className="font-semibold text-base">
                                  {staff.firstName} {staff.lastName}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {staff.email}
                                </p>
                              </div>
                              <StatusBadge
                                status={cert?.status || 'not_certified'}
                                data-testid={`status-badge-${staff.id}`}
                              />
                            </div>

                            {/* Certification Details */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              {cert?.status === 'active' && cert.certifiedAt && (
                                <span>
                                  Certified: {new Date(cert.certifiedAt).toLocaleDateString()}
                                </span>
                              )}
                              {cert?.status === 'active' && daysUntilExp && (
                                <span>
                                  Expires in {daysUntilExp} days
                                </span>
                              )}
                              {cert?.status === 'expiring_soon' && daysUntilExp && (
                                <span className="text-warning font-medium">
                                  Expires in {daysUntilExp} days - Renewal needed!
                                </span>
                              )}
                              {cert?.status === 'expired' && (
                                <span className="text-danger font-medium">
                                  Expired - Immediate recertification required
                                </span>
                              )}
                              {cert?.relatedIncidentCount !== undefined && cert.relatedIncidentCount > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {cert.relatedIncidentCount} incident{cert.relatedIncidentCount !== 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Operations (Future) */}
        {staffList && staffList.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Bulk Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">
                  Bulk CSV upload and advanced management features coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as XLSX from 'xlsx';
import _ from 'lodash';
import { Gift, AlertCircle, CheckCircle2, Users, DollarSign } from "lucide-react";

interface SessionDashboardProps {
  fileData: ArrayBuffer;
}

export const SessionDashboard: React.FC<SessionDashboardProps> = ({ fileData }) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const formatName = (fullName: string) => {
    if (!fullName) return '';
    const [lastName, firstName] = fullName.split(', ');
    return `${firstName} ${lastName}`;
  };

  const formatTime = (timeStr: string | Date) => {
    const date = new Date(timeStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(':00', '');
  };

  const getAppointmentType = (description: string) => {
    if (!description) return 'Other';
    if (description.includes('Springs Visit')) return 'Springs';
    if (description.includes('HIIT') || description.includes('Sculpt') || 
        description.includes('Pilates') || description.includes('Yoga')) return 'Fitness';
    if (description.includes('Personal Training')) return 'Training';
    if (description.includes('Massage') || description.includes('Facial') || 
        description.includes('Body Work') || description.includes('Skincare') ||
        description.includes('Foot Rub')) return 'Treatment';
    return 'Other';
  };

  const getAppointmentColor = (description: string) => {
    const type = getAppointmentType(description);
    switch(type) {
      case 'Springs': return 'bg-blue-50';
      case 'Fitness': return 'bg-green-50';
      case 'Treatment': return 'bg-purple-50';
      case 'Training': return 'bg-orange-50';
      default: return '';
    }
  };
useEffect(() => {
    try {
      const workbook = XLSX.read(fileData, {
        cellDates: true,
        cellStyles: true,
        cellFormulas: true
      });
      
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      // Filter out entries that have no client info or are meetings
      const filteredData = jsonData.filter((row: any) => 
        row.Client && 
        !row.Description?.toLowerCase().includes('meeting') &&
        !((/^[NS][1-5]( CPL)?$/.test(row.Description || '') && !row.Client))
      );

      // Process dates and group data
      const processedData = filteredData.map((row: any) => {
        const startTime = new Date(row['Start time']);
        const isTreatment = row.Description?.includes('Massage') || 
                           row.Description?.includes('Facial') || 
                           row.Description?.includes('Body Work') ||
                           row.Description?.includes('Foot Rub');
        
        // If it's a treatment, use check-in time (105 mins before)
        const displayTime = isTreatment ? 
          new Date(startTime.getTime() - (105 * 60000)) : 
          startTime;

        return {
          ...row,
          startTime,
          displayTime,
          Birthday: row.Birthday ? new Date(row.Birthday) : null,
          waivers: row['Staff Alert'] ? row['Staff Alert'].split('|').map((w: string) => w.trim()) : []
        };
      });

      // Group by display time
      const grouped = _.groupBy(processedData, (row: any) => 
        `${row.displayTime.getHours().toString().padStart(2, '0')}:${row.displayTime.getMinutes().toString().padStart(2, '0')}`
      );

      // Sort and process sessions
      const sortedSessions = Object.entries(grouped)
        .map(([time, appointments]) => {
          // Group appointments by client name to identify parties
          const clientGroups = _.groupBy(appointments, 'Client');
          
          // Add party information to each appointment
          const appointmentsWithPartyInfo = appointments.map(apt => {
            const groupSize = clientGroups[apt.Client]?.length || 1;
            const sameNameCount = clientGroups[apt.Client]?.length || 1;
            const type = getAppointmentType(apt.Description);
            return {
              ...apt,
              partySize: groupSize,
              isPartyMember: groupSize > 1,
              isGroupLeader: groupSize >= 4,
              sameNameCount,
              appointmentType: type
            };
          });

          return {
            time,
            appointments: appointmentsWithPartyInfo.sort((a: any, b: any) => {
              // First sort by appointment type
              const typeOrder = {
                'Springs': 1,
                'Fitness': 2,
                'Treatment': 3,
                'Training': 4,
                'Other': 5
              };
              if (typeOrder[a.appointmentType] !== typeOrder[b.appointmentType]) {
                return typeOrder[a.appointmentType] - typeOrder[b.appointmentType];
              }
              // Then by party size (larger parties first)
              if (a.partySize !== b.partySize) {
                return b.partySize - a.partySize;
              }
              // Then by client name
              return formatName(a.Client)?.localeCompare(formatName(b.Client)) || 0;
            })
          };
        })
        .sort((a, b) => {
          const [aHour, aMin] = a.time.split(':').map(Number);
          const [bHour, bMin] = b.time.split(':').map(Number);
          return (aHour * 60 + aMin) - (bHour * 60 + bMin);
        });

      setSessions(sortedSessions);
      setLoading(false);
    } catch (error) {
      console.error('Error processing file:', error);
      setLoading(false);
    }
  }, [fileData]);
const checkWaiverStatus = (waivers: string[], appointmentDate: string | Date) => {
    const latestWaiver = waivers
      .filter(w => w.includes('Waiver Added:'))
      .sort((a, b) => {
        const dateA = new Date(a.split('Waiver Added:')[1].split(' ')[1]);
        const dateB = new Date(b.split('Waiver Added:')[1].split(' ')[1]);
        return dateB - dateA;
      })[0];

    if (!latestWaiver) return false;
    
    const waiverDate = new Date(latestWaiver.split('Waiver Added:')[1].split(' ')[1]);
    const daysSinceWaiver = Math.floor((new Date(appointmentDate).getTime() - waiverDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysSinceWaiver <= 365;
  };

  const isBirthday = (birthdayStr: string | null) => {
    if (!birthdayStr) return false;
    const birthday = new Date(birthdayStr);
    const today = new Date();
    return birthday.getMonth() === today.getMonth() && 
           birthday.getDate() === today.getDate();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-lg">Loading sessions...</p>
      </div>
    );
  }
return (
    <div className="space-y-4 p-4">
      {/* Today's Groups Section */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Groups</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            // First, create groups object
            const groupsObj = sessions.flatMap(session => session.appointments)
              .reduce((groups: any, appointment: any) => {
                const key = `${appointment.Client}_${appointment.startTime.getTime()}`;
                if (!groups[key]) {
                  groups[key] = {
                    client: appointment.Client,
                    time: appointment.startTime,
                    displayTime: appointment.displayTime,
                    type: getAppointmentType(appointment.Description),
                    count: 1
                  };
                } else {
                  groups[key].count++;
                }
                return groups;
              }, {});

            // Convert to array and filter
            const largeGroups = Object.values(groupsObj)
              .filter((group: any) => group.count >= 4)
              .sort((a: any, b: any) => a.displayTime - b.displayTime);

            return largeGroups.length > 0 ? (
              largeGroups.map((group: any, idx: number) => (
                <div 
                  key={idx} 
                  className={`mb-4 p-3 rounded ${
                    group.type === 'Springs' ? 'bg-blue-50' :
                    group.type === 'Treatment' ? 'bg-purple-50' :
                    group.type === 'Fitness' ? 'bg-green-50' :
                    'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {formatName(group.client)} Party of {group.count}
                    </span>
                    <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {formatTime(group.time)}
                    </span>
                    <span className="text-sm text-gray-600">
                      {group.type}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 italic">No individual parties of 4 or more today</div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Session Cards */}
      {sessions.map(({ time, appointments }) => {
        const timeDate = new Date();
        const [hours, minutes] = time.split(':').map(Number);
        timeDate.setHours(hours, minutes);
        
        return (
          <Card key={time} className="overflow-hidden">
            <CardHeader className="bg-gray-50">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl">{formatTime(timeDate)}</span>
                  <span className="text-sm text-gray-500">
                    ({appointments.length} {appointments.length === 1 ? 'reservation' : 'reservations'})
                  </span>
                </CardTitle>
                <div className="flex gap-2">
                  {Object.entries(_.groupBy(appointments, 'appointmentType'))
                    .sort(([typeA], [typeB]) => {
                      const typeOrder = {
                        'Springs': 1,
                        'Fitness': 2,
                        'Treatment': 3,
                        'Training': 4,
                        'Other': 5
                      };
                      return typeOrder[typeA as keyof typeof typeOrder] - typeOrder[typeB as keyof typeof typeOrder];
                    })
                    .map(([type, group]) => (
                    <span key={type} className={`text-sm px-2 py-1 rounded ${
                      type === 'Springs' ? 'bg-blue-100 text-blue-800' :
                      type === 'Fitness' ? 'bg-green-100 text-green-800' :
                      type === 'Treatment' ? 'bg-purple-100 text-purple-800' :
                      type === 'Training' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {type}: {group.length}
                    </span>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2">
                {appointments.map((appointment: any, idx: number) => {
                  const prevAppointment = appointments[idx - 1];
                  const isGuest = prevAppointment && prevAppointment.Client === appointment.Client;
                  const partyStyle = appointment.isPartyMember ? 'border-l-4 border-indigo-300 pl-2' : '';
                  
                  return (
                    <div 
                      key={idx} 
                      className={`flex items-center justify-between p-2 rounded ${getAppointmentColor(appointment.Description)} ${partyStyle}`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {isGuest ? `${formatName(appointment.Client)}'s Guest` : formatName(appointment.Client)}
                            </span>
                            {appointment.isGroupLeader && (
                              <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded">
                                {appointment.appointmentType} Group
                              </span>
                            )}
                            {isBirthday(appointment.Birthday) && (
                              <Gift className="h-4 w-4 text-blue-500" />
                            )}
                            {appointment['First Visit'] === 'Yes' && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">
                                First Visit
                              </span>
                            )}
                            {!checkWaiverStatus(appointment.waivers, appointment.Date) && (
                              <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Waiver Needed
                              </span>
                            )}
                            {appointment['Unpaid Appointment'] === 'Yes' && (
                              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                Unpaid
                              </span>
                            )}
                            {appointment.Description?.includes('Couples') && (
                              <Users className="h-4 w-4 text-pink-500" />
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {appointment.Description?.split('/').pop().trim()}
                            {(appointment.appointmentType === 'Treatment' || appointment.Description?.includes('Foot Rub')) && (
                              <>
                                {` with ${appointment['Therapist Member']}`}
                                <span className="ml-2 text-blue-600">
                                  (Treatment time: {formatTime(appointment.startTime)})
                                </span>
                              </>
                            )}
                          </div>
                          {appointment['Appointment Notes'] && (
                            <div className="text-sm text-gray-500 mt-1 italic">
                              {(() => {
                                const notes = appointment['Appointment Notes'];
                                const forMatch = notes.match(/for\s+([^,\n]+)/i);
                                if (forMatch) {
                                  const beforeFor = notes.substring(0, notes.toLowerCase().indexOf('for '));
                                  const nameAfterFor = forMatch[1];
                                  const afterName = notes.substring(notes.toLowerCase().indexOf('for ') + 4 + nameAfterFor.length);
                                  return (
                                    <>
                                      {beforeFor}
                                      <span className="font-bold">for {nameAfterFor}</span>
                                      {afterName}
                                    </>
                                  );
                                }
                                return notes;
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
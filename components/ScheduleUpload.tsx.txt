'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionDashboard } from './SessionDashboard';

export const ScheduleUpload = () => {
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [error, setError] = useState('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's an Excel file
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      setFileData(buffer);
      setError('');
    } catch (err) {
      setError('Error reading file. Please try again.');
      console.error('Upload error:', err);
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {!fileData ? (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Upload Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Choose Schedule File
                </label>
                <p className="mt-2 text-sm text-gray-600">
                  Upload your Schedule at a Glance Excel file
                </p>
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Instructions:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Export your "Schedule at a Glance" report from your system</li>
                  <li>Save it as an Excel file (.xlsx or .xls)</li>
                  <li>Click "Choose Schedule File" above and select your saved file</li>
                  <li>The dashboard will automatically load and display your schedule</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <SessionDashboard fileData={fileData} />
      )}
    </div>
  );
};
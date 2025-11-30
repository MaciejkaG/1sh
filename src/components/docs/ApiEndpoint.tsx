'use client';

import { ApiTester } from './ApiTester';
import { SchemaViewer } from './SchemaViewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ApiEndpointProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
    example?: string;
  }>;
  requestBody?: {
    type: string;
    properties: Record<string, {
      type: string;
      required: boolean;
      description: string;
      example?: unknown;
    }>;
  };
  responseSchema?: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
  errorResponses?: Array<{
    status: number;
    description: string;
    schema: {
      type: string;
      properties: Record<string, unknown>;
    };
  }>;
}

export function ApiEndpoint(props: ApiEndpointProps) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="try-it" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="try-it">Try it out</TabsTrigger>
          <TabsTrigger value="response">Response Schema</TabsTrigger>
          <TabsTrigger value="errors">Error Responses</TabsTrigger>
        </TabsList>
        
        <TabsContent value="try-it" className="space-y-4">
          <ApiTester endpoint={props} />
        </TabsContent>
        
        <TabsContent value="response" className="space-y-4">
          {props.responseSchema && (
            <SchemaViewer 
              schema={props.responseSchema} 
              title="Success Response" 
            />
          )}
        </TabsContent>
        
        <TabsContent value="errors" className="space-y-4">
          {props.errorResponses?.map((error, index) => (
            <div key={index} className="space-y-2">
              <h4 className="text-lg font-semibold">
                {error.status} - {error.description}
              </h4>
              <SchemaViewer 
                schema={error.schema} 
                title={`Error Response (${error.status})`} 
              />
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
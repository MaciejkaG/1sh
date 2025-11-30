'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SchemaProperty {
  type: string;
  description: string;
  required?: boolean;
  example?: unknown;
  enum?: string[];
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
}

interface Schema {
  type: string;
  properties: Record<string, SchemaProperty | unknown>;
  required?: string[];
}

interface SchemaViewerProps {
  schema: Schema;
  title: string;
}

export function SchemaViewer({ schema, title }: SchemaViewerProps) {
  const renderProperty = (name: string, property: SchemaProperty | unknown, level = 0) => {
    // Type guard to ensure we're working with a SchemaProperty
    if (!property || typeof property !== 'object' || !('type' in property)) {
      return null;
    }
    
    const prop = property as SchemaProperty;
    const isRequired = schema.required?.includes(name) || prop.required;
    const indent = level * 20;

    return (
      <div key={name} className="border-l-2 border-muted pl-4 py-2" style={{ marginLeft: indent }}>
        <div className="flex items-center gap-2 mb-1">
          <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">
            {name}
          </code>
          <Badge variant="outline" className="text-xs">
            {prop.type}
          </Badge>
          {isRequired && (
            <Badge variant="destructive" className="text-xs">
              Required
            </Badge>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground mb-2">
          {prop.description}
        </p>

        {prop.example !== undefined && (
          <div className="mb-2">
            <span className="text-xs font-semibold text-muted-foreground">Example: </span>
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              {typeof prop.example === 'string' 
                ? `"${prop.example}"` 
                : JSON.stringify(prop.example)
              }
            </code>
          </div>
        )}

        {prop.enum && (
          <div className="mb-2">
            <span className="text-xs font-semibold text-muted-foreground">Enum: </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {prop.enum.map((value) => (
                <Badge key={value} variant="outline" className="text-xs">
                  {value}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {prop.type === 'object' && prop.properties && (
          <div className="mt-2">
            {Object.entries(prop.properties).map(([propName, nestedProp]) =>
              renderProperty(propName, nestedProp, level + 1)
            )}
          </div>
        )}

        {prop.type === 'array' && prop.items && (
          <div className="mt-2">
            <div className="text-xs font-semibold text-muted-foreground mb-1">Array items:</div>
            {renderProperty('item', prop.items, level + 1)}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.entries(schema.properties).map(([name, property]) =>
            renderProperty(name, property)
          )}
        </div>
      </CardContent>
    </Card>
  );
}
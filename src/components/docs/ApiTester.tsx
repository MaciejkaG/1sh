'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Play, Loader2 } from 'lucide-react';

interface ApiEndpoint {
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
}

interface ApiTesterProps {
  endpoint: ApiEndpoint;
}

export function ApiTester({ endpoint }: ApiTesterProps) {
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [requestBody, setRequestBody] = useState<string>('');
  const [response, setResponse] = useState<{
    status: number;
    data: unknown;
    headers: Record<string, string>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParameterChange = (name: string, value: string) => {
    setParameters(prev => ({ ...prev, [name]: value }));
  };

  const buildUrl = () => {
    let url = endpoint.path;
    
    // Replace path parameters
    Object.entries(parameters).forEach(([key, value]) => {
      url = url.replace(`[${key}]`, value);
    });

    // Add query parameters
    const queryParams = new URLSearchParams();
    endpoint.parameters?.forEach(param => {
      if (param.name in parameters && parameters[param.name]) {
        if (!endpoint.path.includes(`[${param.name}]`)) {
          queryParams.append(param.name, parameters[param.name]);
        }
      }
    });

    const queryString = queryParams.toString();
    return queryString ? `${url}?${queryString}` : url;
  };

  const generateCurlCommand = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://1sh.dev';
    const url = `${origin}${buildUrl()}`;
    let curl = `curl -X ${endpoint.method} "${url}"`;
    
    if (endpoint.method !== 'GET' && requestBody) {
      curl += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody}'`;
    }
    
    return curl;
  };

  const generateJavaScriptCode = () => {
    const url = buildUrl();
    const options: Record<string, unknown> = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (endpoint.method !== 'GET' && requestBody) {
      options.body = requestBody;
    }

    return `fetch('${url}', ${JSON.stringify(options, null, 2)})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`;
  };

  const generatePythonCode = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://1sh.dev';
    const url = buildUrl();
    let code = `import requests\n\n`;
    
    if (endpoint.method === 'GET') {
      code += `response = requests.get('${origin}${url}')`;
    } else {
      code += `response = requests.${endpoint.method.toLowerCase()}(\n`;
      code += `    '${origin}${url}',\n`;
      code += `    headers={'Content-Type': 'application/json'},\n`;
      if (requestBody) {
        code += `    json=${requestBody}\n`;
      }
      code += `)`;
    }
    
    code += `\nprint(response.json())`;
    return code;
  };

  const executeRequest = async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const url = buildUrl();
      const options: RequestInit = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (endpoint.method !== 'GET' && requestBody) {
        options.body = requestBody;
      }

      const res = await fetch(url, options);
      const data = await res.json();
      
      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headers[key] = value;
      });

      setResponse({
        status: res.status,
        data,
        headers,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

  const getDefaultRequestBody = () => {
    if (!endpoint.requestBody) return '';
    
    const example: Record<string, unknown> = {};
    Object.entries(endpoint.requestBody.properties).forEach(([key, prop]) => {
      example[key] = prop.example || '';
    });
    
    return JSON.stringify(example, null, 2);
  };

  return (
    <div className="space-y-6">
      {/* Endpoint Info */}
      <div className="flex items-center gap-2">
        <Badge variant={endpoint.method === 'GET' ? 'secondary' : 'default'}>
          {endpoint.method}
        </Badge>
        <code className="text-sm bg-muted px-2 py-1 rounded">
          {endpoint.path}
        </code>
      </div>

      <p className="text-muted-foreground">{endpoint.description}</p>

      {/* Parameters */}
      {endpoint.parameters && endpoint.parameters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {endpoint.parameters.map((param) => (
              <div key={param.name} className="space-y-2">
                <Label htmlFor={param.name} className="flex items-center gap-2">
                  {param.name}
                  {param.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                  <span className="text-xs text-muted-foreground">({param.type})</span>
                </Label>
                <Input
                  id={param.name}
                  placeholder={param.example || param.description}
                  value={parameters[param.name] || ''}
                  onChange={(e) => handleParameterChange(param.name, e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{param.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Request Body */}
      {endpoint.requestBody && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Request Body</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={getDefaultRequestBody()}
              value={requestBody || getDefaultRequestBody()}
              onChange={(e) => setRequestBody(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>
      )}

      {/* Try It Button */}
      <Button onClick={executeRequest} disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Executing...
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Try it out
          </>
        )}
      </Button>

      {/* Response */}
      {response && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              Response
              <Badge variant={response.status < 400 ? 'secondary' : 'destructive'}>
                {response.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
              {JSON.stringify(response.data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Code Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* cURL */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">cURL</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(generateCurlCommand())}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
              {generateCurlCommand()}
            </pre>
          </div>

          {/* JavaScript */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">JavaScript</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(generateJavaScriptCode())}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
              {generateJavaScriptCode()}
            </pre>
          </div>

          {/* Python */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Python</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(generatePythonCode())}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
              {generatePythonCode()}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { Copy, Trash2, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Token {
  id: string;
  name: string;
  status: "active" | "revoked";
  created_at: string;
  revoked_at: string | null;
}

interface NewToken {
  id: string;
  name: string;
  token: string;
  created_at: string;
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [newToken, setNewToken] = useState<NewToken | null>(null);
  const [showTokenValue, setShowTokenValue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/v1/settings/tokens");

      if (!response.ok) {
        throw new Error("Failed to fetch tokens");
      }

      const data = await response.json();
      setTokens(data.tokens || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      toast.error("Failed to load tokens");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateToken = async () => {
    if (!tokenName.trim()) {
      setError("Token name is required");
      return;
    }

    try {
      setError(null);
      setIsCreating(true);
      const response = await fetch("/api/v1/settings/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: tokenName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create token");
      }

      const data = await response.json();
      setNewToken(data.token);
      setTokenName("");
      toast.success("Token created successfully");
      fetchTokens();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    if (!confirm("Are you sure you want to revoke this token? This action cannot be undone.")) {
      return;
    }

    try {
      setError(null);
      setRevoking(tokenId);
      const response = await fetch(`/api/v1/settings/tokens/${tokenId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to revoke token");
      }

      toast.success("Token revoked successfully");
      fetchTokens();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      toast.error(message);
    } finally {
      setRevoking(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Automation Tokens</h1>
          <p className="text-muted-foreground">
            Create and manage API tokens for automation and CI/CD workflows
          </p>
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </Alert>
        )}

        {newToken && (
          <Card className="border-gray-100 p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold mb-1">
                    Token Created Successfully
                  </h3>
                  <p className="text-sm ">
                    Copy your token now. You won't be able to see it again.
                  </p>
                </div>
              </div>

              <div className="rounded border border-gray-100 p-4">
                <div className="flex items-center justify-between gap-6">
                  <code className="text-sm font-mono text-foreground overflow-hidden text-ellipsis">
                    {showTokenValue
                      ? newToken.token
                      : newToken.token.substring(0, 20) + "..."}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTokenValue(!showTokenValue)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {showTokenValue ? "Hide" : "Show"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(newToken.token)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => setNewToken(null)}
                className="w-full"
              >
                Done
              </Button>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-4">Create New Token</h2>
              <Label htmlFor="token-name" className="mb-2 block">
                Token Name
              </Label>
              <div className="flex gap-3">
                <Input
                  id="token-name"
                  placeholder="e.g., CI/CD Pipeline, Build Server"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isCreating) {
                      handleCreateToken();
                    }
                  }}
                  disabled={isCreating}
                  className="flex-1"
                />
                <Button
                  onClick={handleCreateToken}
                  disabled={isCreating || !tokenName.trim()}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Generate
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Your Tokens</h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No tokens created yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{token.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Created {formatDate(token.created_at)}
                        </p>
                      </div>
                      <div className="ml-auto">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            token.status === "active"
                              ? "border border-gray-100"
                              : "border border-gray-100"
                          }`}
                        >
                          {token.status === "active" ? "Active" : "Revoked"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRevokeToken(token.id)}
                    disabled={revoking === token.id || token.status === "revoked"}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-4"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="space-y-3">
            <h3 className="font-semibold">Security Tips</h3>
            <ul className="text-sm text-white space-y-2">
              <li>• Never share your tokens with others</li>
              <li>• Store tokens securely in environment variables</li>
              <li>• Revoke tokens immediately if they are compromised</li>
              <li>• Use descriptive names to identify token purposes</li>
              <li>• Regularly review and rotate your tokens</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}

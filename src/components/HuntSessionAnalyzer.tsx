"use client";

import React, { useState, useCallback } from "react";
import {
  Copy,
  Save,
  Upload,
  Download,
  Users,
  Clock,
  Coins,
} from "lucide-react";

// Types
interface PlayerData {
  name: string;
  loot: number;
  supplies: number;
  balance: number;
  damage: number;
  healing: number;
  isLeader?: boolean;
}

interface SessionData {
  startDate: string;
  endDate: string;
  duration: string;
  lootType: "Leader" | "Market" | "Split";
  totalLoot: number;
  totalSupplies: number;
  totalBalance: number;
  players: PlayerData[];
}

interface Transfer {
  from: string;
  to: string;
  amount: number;
}

const HuntSessionAnalyzer: React.FC = () => {
  const [sessionText, setSessionText] = useState("");
  const [parsedSession, setParsedSession] = useState<SessionData | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [savedSessions, setSavedSessions] = useState<SessionData[]>([]);

  const parseSessionData = useCallback((text: string): SessionData | null => {
    try {
      const lines = text
        .trim()
        .split("\n")
        .map((line) => line.trim());

      // Parse session info
      const sessionLine = lines.find((line) =>
        line.startsWith("Session data:")
      );
      if (!sessionLine) throw new Error("Session data line not found");

      const dateMatch = sessionLine.match(
        /From (\d{4}-\d{2}-\d{2}, \d{2}:\d{2}:\d{2}) to (\d{4}-\d{2}-\d{2}, \d{2}:\d{2}:\d{2})/
      );
      if (!dateMatch) throw new Error("Date format not recognized");

      const durationLine = lines.find((line) => line.startsWith("Session:"));
      const duration = durationLine?.split(":")[1]?.trim() || "00:00h";

      const lootTypeLine = lines.find((line) => line.startsWith("Loot Type:"));
      const lootType = (lootTypeLine?.split(":")[1]?.trim() || "Leader") as
        | "Leader"
        | "Market"
        | "Split";

      const totalLootLine = lines.find((line) => line.startsWith("Loot:"));
      const totalLoot = parseInt(
        totalLootLine?.split(":")[1]?.trim().replace(/,/g, "") || "0"
      );

      const totalSuppliesLine = lines.find((line) =>
        line.startsWith("Supplies:")
      );
      const totalSupplies = parseInt(
        totalSuppliesLine?.split(":")[1]?.trim().replace(/,/g, "") || "0"
      );

      const balanceLine = lines.find((line) => line.startsWith("Balance:"));
      const totalBalance = parseInt(
        balanceLine?.split(":")[1]?.trim().replace(/,/g, "") || "0"
      );

      // Parse players
      const players: PlayerData[] = [];
      let currentPlayer: Partial<PlayerData> = {};

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (
          line &&
          !line.includes(":") &&
          !line.startsWith("Session") &&
          !line.startsWith("Loot") &&
          !line.startsWith("Supplies") &&
          !line.startsWith("Balance")
        ) {
          if (currentPlayer.name) {
            players.push(currentPlayer as PlayerData);
          }
          currentPlayer = {
            name: line.replace("(Leader)", "").trim(),
            isLeader: line.includes("(Leader)"),
            loot: 0,
            supplies: 0,
            balance: 0,
            damage: 0,
            healing: 0,
          };
        } else if (line.includes("Loot:") && currentPlayer.name) {
          currentPlayer.loot = parseInt(
            line.split(":")[1].trim().replace(/,/g, "")
          );
        } else if (line.includes("Supplies:") && currentPlayer.name) {
          currentPlayer.supplies = parseInt(
            line.split(":")[1].trim().replace(/,/g, "")
          );
        } else if (line.includes("Balance:") && currentPlayer.name) {
          currentPlayer.balance = parseInt(
            line.split(":")[1].trim().replace(/,/g, "")
          );
        } else if (line.includes("Damage:") && currentPlayer.name) {
          currentPlayer.damage = parseInt(
            line.split(":")[1].trim().replace(/,/g, "")
          );
        } else if (line.includes("Healing:") && currentPlayer.name) {
          currentPlayer.healing = parseInt(
            line.split(":")[1].trim().replace(/,/g, "")
          );
        }
      }

      if (currentPlayer.name) {
        players.push(currentPlayer as PlayerData);
      }

      return {
        startDate: dateMatch[1],
        endDate: dateMatch[2],
        duration,
        lootType,
        totalLoot,
        totalSupplies,
        totalBalance,
        players,
      };
    } catch (error) {
      console.error("Error parsing session data:", error);
      return null;
    }
  }, []);

  const handleParseSession = useCallback(() => {
    if (!sessionText.trim()) return;

    const parsed = parseSessionData(sessionText);
    if (parsed) {
      setParsedSession(parsed);
      calculateTransfers(parsed);
    }
  }, [sessionText, parseSessionData]);

  const calculateTransfers = (session: SessionData) => {
    const transfers: Transfer[] = [];
    const leader = session.players.find((p) => p.isLeader);

    if (!leader) {
      setTransfers([]);
      return;
    }

    // Calculate balance per player
    const balancePerPlayer = session.totalBalance / session.players.length;

    // Calculate transfers to each player (including leader)
    session.players.forEach((player) => {
      // What each player should receive: their supplies + their share of balance
      const shouldReceive = player.supplies + balancePerPlayer;

      // Only create transfers for non-leader players
      if (player.name !== leader.name) {
        transfers.push({
          from: leader.name,
          to: player.name,
          amount: Math.round(shouldReceive),
        });
      }
    });

    setTransfers(transfers);
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr.replace(", ", "T"));
    return (
      date.toLocaleDateString() + " - " + date.toLocaleTimeString().slice(0, 5)
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyTransferCommand = (transfer: Transfer) => {
    const command = `transfer ${transfer.amount} to ${transfer.to}`;
    navigator.clipboard.writeText(command);
  };

  const copyAllTransfers = () => {
    const commands = transfers
      .map((transfer) => `transfer ${transfer.amount} to ${transfer.to}`)
      .join("\n");
    navigator.clipboard.writeText(commands);
  };

  const saveSession = () => {
    if (parsedSession) {
      setSavedSessions((prev) => [...prev, parsedSession]);
    }
  };

  const totalProfit = transfers.reduce(
    (sum, transfer) => sum + transfer.amount,
    0
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-lg">
          <div className="border-b border-gray-700 px-6 py-4">
            <div className="flex items-center gap-4">
              <img src="/amlo.jpg" width={100} height={50} />
              <h1 className="text-xl font-bold">Hunt manito</h1>
            </div>
          </div>

          <div className="flex">
            <div className="w-80 border-r border-gray-700 p-4">
              <div className="space-y-4">
                <div className="flex bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab("new")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      activeTab === "new"
                        ? "bg-purple-600 text-white"
                        : "text-gray-300 hover:text-white"
                    }`}
                  >
                    New session
                  </button>
                  <button
                    onClick={() => setActiveTab("history")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      activeTab === "history"
                        ? "bg-purple-600 text-white"
                        : "text-gray-300 hover:text-white"
                    }`}
                  >
                    History ({savedSessions.length})
                  </button>
                </div>

                {activeTab === "new" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Paste your party hunt session{" "}
                        <span className="text-gray-400 ml-1">ℹ️</span>
                      </label>
                      <textarea
                        value={sessionText}
                        onChange={(e) => setSessionText(e.target.value)}
                        placeholder="Session data: From 2025-07-14, 18:13:49 to 2025-07-14, 19:58:37&#10;Session: 01:44h&#10;Loot Type: Leader&#10;..."
                        className="w-full h-64 p-3 bg-gray-700 border border-gray-600 rounded-md text-sm font-mono resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <button
                      onClick={handleParseSession}
                      disabled={!sessionText.trim()}
                      className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
                    >
                      Paga ek de mierda
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedSessions.map((session, index) => (
                      <div
                        key={index}
                        onClick={() => setParsedSession(session)}
                        className="p-3 bg-gray-700 hover:bg-gray-600 rounded-md cursor-pointer transition-colors"
                      >
                        <div className="text-sm font-medium">Team session</div>
                        <div className="text-xs text-gray-400">
                          {formatDate(session.startDate)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 p-6">
              {parsedSession ? (
                <div className="space-y-6">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">SUMMARY</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <Users className="text-blue-400" size={20} />
                        <div>
                          <div className="text-sm text-gray-400">
                            Team session
                          </div>
                          <div className="font-medium">
                            {parsedSession.players.length} players
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Clock className="text-green-400" size={20} />
                        <div>
                          <div className="text-sm text-gray-400">Duration</div>
                          <div className="font-medium">
                            {parsedSession.duration}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Coins className="text-yellow-400" size={20} />
                        <div>
                          <div className="text-sm text-gray-400">Loot Type</div>
                          <div className="font-medium">
                            {parsedSession.lootType}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-gray-400 mb-2">
                      {formatDate(parsedSession.startDate)} -{" "}
                      {formatDate(parsedSession.endDate)}
                    </div>
                  </div>

                  {transfers.length > 0 && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-4">Transfers</h3>
                      <div className="space-y-3">
                        {transfers.map((transfer, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-800 rounded-md"
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-sm">
                                <span className="text-yellow-400">
                                  {transfer.from}
                                </span>
                                <span className="text-gray-400 mx-2">→</span>
                                <span className="text-blue-400">
                                  {transfer.to}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-yellow-400 text-sm">●</span>
                              <span className="font-medium">
                                {formatNumber(transfer.amount)}
                              </span>
                              <button
                                onClick={() => copyTransferCommand(transfer)}
                                className="p-1 hover:bg-gray-600 rounded transition-colors"
                                title={`Copy: transfer ${transfer.amount} to ${transfer.to}`}
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {totalProfit > 0 && (
                        <div className="mt-4 p-3 bg-orange-600/20 rounded-md">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              Total session profit
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-orange-400 text-sm">●</span>
                              <span className="font-bold">
                                {formatNumber(
                                  parsedSession.totalLoot -
                                    parsedSession.totalSupplies
                                )}{" "}
                                total
                              </span>
                              <span className="text-xs text-gray-400">
                                (
                                {formatNumber(
                                  (parsedSession.totalLoot -
                                    parsedSession.totalSupplies) /
                                    parsedSession.players.length
                                )}{" "}
                                per player)
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {transfers.length > 0 && (
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={copyAllTransfers}
                            className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
                          >
                            Copy All Commands
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">
                      Player Statistics
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-600">
                            <th className="text-left py-2">Player</th>
                            <th className="text-right py-2">Loot</th>
                            <th className="text-right py-2">Supplies</th>
                            <th className="text-right py-2">Balance</th>
                            <th className="text-right py-2">Should Receive</th>
                            <th className="text-right py-2">Damage</th>
                            <th className="text-right py-2">Healing</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedSession.players.map((player, index) => {
                            const balancePerPlayer =
                              parsedSession.totalBalance /
                              parsedSession.players.length;
                            const shouldReceive =
                              player.supplies + balancePerPlayer;

                            return (
                              <tr
                                key={index}
                                className="border-b border-gray-600/50"
                              >
                                <td className="py-2">
                                  <div className="flex items-center gap-2">
                                    {player.isLeader && (
                                      <span className="text-yellow-400 text-xs">
                                        👑
                                      </span>
                                    )}
                                    <span
                                      className={
                                        player.isLeader
                                          ? "font-medium text-yellow-400"
                                          : ""
                                      }
                                    >
                                      {player.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="text-right py-2 text-green-400">
                                  {formatNumber(player.loot)}
                                </td>
                                <td className="text-right py-2 text-red-400">
                                  {formatNumber(player.supplies)}
                                </td>
                                <td
                                  className={`text-right py-2 ${
                                    player.balance >= 0
                                      ? "text-green-400"
                                      : "text-red-400"
                                  }`}
                                >
                                  {formatNumber(player.balance)}
                                </td>
                                <td className="text-right py-2 text-blue-400 font-semibold">
                                  {formatNumber(Math.round(shouldReceive))}
                                </td>
                                <td className="text-right py-2">
                                  {formatNumber(player.damage)}
                                </td>
                                <td className="text-right py-2">
                                  {formatNumber(player.healing)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 p-3 bg-gray-600/30 rounded-md text-xs text-gray-300">
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <strong>Formula:</strong> Should Receive = Individual
                          Supplies + (Total Balance ÷{" "}
                          {parsedSession.players.length} players)
                        </div>
                        <div className="text-orange-300">
                          <strong>Balance per player:</strong>{" "}
                          {formatNumber(parsedSession.totalBalance)} ÷{" "}
                          {parsedSession.players.length} ={" "}
                          <span className="font-bold">
                            {formatNumber(
                              Math.round(
                                parsedSession.totalBalance /
                                  parsedSession.players.length
                              )
                            )}
                          </span>
                        </div>
                        <div className="text-blue-300">
                          <strong>Logic:</strong> Leader transfers to each
                          player their supplies + their fair share of the total
                          balance
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={saveSession}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md font-medium transition-colors"
                    >
                      <Save size={16} />
                      SAVE
                    </button>

                    <button
                      onClick={() =>
                        copyToClipboard(JSON.stringify(parsedSession, null, 2))
                      }
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-medium transition-colors"
                    >
                      <Download size={16} />
                      Export
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center text-gray-400">
                    <Upload size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">No session data</p>
                    <p className="text-sm">
                      Paste your hunt session data to get started
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <footer className="mt-8 py-4 border-t border-gray-800 text-center">
        <div className="flex items-center justify-center gap-2">
          <a
            href="https://github.com/JairAsaelLozano"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img
              src="/github-mark-white.png"
              width={24}
              height={24}
              alt="GitHub Logo"
              className="invert"
            />
            <span className="text-gray-400 hover:text-white transition-colors">
              JairAsaelLozano
            </span>
          </a>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          © {new Date().getFullYear()} Hunt Manito
        </p>
      </footer>
    </div>
  );
};

export default HuntSessionAnalyzer;

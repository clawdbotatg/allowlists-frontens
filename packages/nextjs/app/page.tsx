"use client";

import { useEffect, useMemo, useState } from "react";
import { Address, AddressInput, EtherInput } from "@scaffold-ui/components";
import { useFetchNativeCurrencyPrice } from "@scaffold-ui/hooks";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { mainnet } from "viem/chains";
import { useAccount, useSwitchChain } from "wagmi";
import {
  ArrowPathIcon,
  BoltIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FireIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

/** Integer sqrt on bigint — mirrors the contract's curve exactly. */
const bigintSqrt = (v: bigint): bigint => {
  if (v < 2n) return v;
  let x = v;
  let y = (x + 1n) >> 1n;
  while (y < x) {
    x = y;
    y = (x + v / x) >> 1n;
  }
  return x;
};

/** points = sqrt(weight) * 1000 / 1e9 — same as WhitelistCurator._curve */
const pointsFromWeight = (w: bigint): bigint => (bigintSqrt(w) * 1000n) / 1_000_000_000n;

const fmtEth = (wei?: bigint, digits = 4) => {
  if (wei === undefined) return "…";
  const s = formatEther(wei);
  const [int, frac = ""] = s.split(".");
  const trimmed = frac.slice(0, digits).replace(/0+$/, "");
  return trimmed ? `${int}.${trimmed}` : int;
};

const fmtDuration = (secs: number) => {
  if (secs < 0) secs = 0;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
};

const Stat = ({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) => (
  <div className="flex flex-col items-center bg-base-100 border border-base-300 rounded-xl px-6 py-4 min-w-36">
    <span className="text-xs uppercase tracking-wider opacity-60">{label}</span>
    <span className="text-2xl font-bold">{value}</span>
    {sub && <span className="text-xs opacity-60">{sub}</span>}
  </div>
);

const Home: NextPage = () => {
  const { address: connectedAddress, chain } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const wrongNetwork = !!connectedAddress && chain?.id !== mainnet.id;
  const { price: ethPrice } = useFetchNativeCurrencyPrice();
  // "(~$1,234)" suffix for an ETH wei amount, or "" while the price is loading
  const usd = (wei?: bigint) =>
    ethPrice > 0 && wei !== undefined
      ? ` (~$${(Number(formatEther(wei)) * ethPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })})`
      : "";

  // ── immutable config ──
  const { data: launchTime } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "launchTime",
    watch: false,
  });
  const { data: hourlyThreshold } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "hourlyThreshold",
    watch: false,
  });
  const { data: gracePeriod } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "gracePeriod",
    watch: false,
  });
  const { data: hourDuration } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "hourDuration",
    watch: false,
  });
  const { data: minDeposit } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "minDeposit",
    watch: false,
  });
  const { data: minEscalation } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "minEscalation",
    watch: false,
  });
  const { data: creditCap } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "creditCap",
    watch: false,
  });
  const { data: firstJudgedHour } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "firstJudgedHour",
    watch: false,
  });

  // ── live state ──
  const { data: settled } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "isSettled",
    watch: true,
  });
  const { data: currentHour } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "currentHour",
    watch: true,
  });
  const { data: currentHourTotal } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "currentHourTotal",
    watch: true,
  });
  const { data: ethNeeded } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "ethNeededThisHour",
    watch: true,
  });
  const { data: earlyBps } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "earlyMultiplierBps",
    watch: true,
  });
  const { data: stats } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "stats",
    watch: true,
  });

  // ── your standing ──
  const { data: yourHighWater } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "contributedBy",
    args: [connectedAddress],
    watch: true,
  });
  const { data: yourWeight } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "weightOf",
    args: [connectedAddress],
    watch: true,
  });
  const { data: yourPoints } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "pointsOf",
    args: [connectedAddress],
    watch: true,
  });
  const { data: yourTxCount } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "txCountOf",
    args: [connectedAddress],
    watch: true,
  });
  const { data: requiredNext } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "requiredNext",
    args: [connectedAddress],
    watch: true,
  });

  const { writeContractAsync: writeCurator, isMining } = useScaffoldWriteContract({ contractName: "WhitelistCurator" });

  // ── ticking clock, resynced against the chain each poll ──
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const hourDur = hourDuration !== undefined ? Number(hourDuration) : 3600;
  const secsLeftInHour = launchTime !== undefined ? hourDur - ((now - Number(launchTime)) % hourDur) : undefined;
  const inGrace =
    currentHour !== undefined && firstJudgedHour !== undefined ? currentHour < firstJudgedHour : undefined;
  const graceEndsAt =
    launchTime !== undefined && gracePeriod !== undefined ? Number(launchTime) + Number(gracePeriod) : undefined;

  const hourPct =
    currentHourTotal !== undefined && hourlyThreshold !== undefined && hourlyThreshold > 0n
      ? Math.min(100, Number((currentHourTotal * 100n) / hourlyThreshold))
      : 0;

  // ── deposit widget ──
  // EtherInput is uncontrolled (defaultValue + onValueChange), so quick-fill
  // buttons remount it with a new key to push a value in.
  const [amountStr, setAmountStr] = useState("");
  const [fill, setFill] = useState<{ nonce: number; value: string }>({ nonce: 0, value: "" });
  const quickFill = (wei: bigint) => {
    const v = formatEther(wei);
    setAmountStr(v);
    setFill(f => ({ nonce: f.nonce + 1, value: v }));
  };
  const amountWei = useMemo(() => {
    try {
      return amountStr ? parseEther(amountStr) : undefined;
    } catch {
      return undefined;
    }
  }, [amountStr]);

  const meetsMinimum = amountWei !== undefined && requiredNext !== undefined && amountWei >= requiredNext;

  // Mirror of _credit(): what this deposit would earn, at the current multiplier.
  const preview = useMemo(() => {
    if (amountWei === undefined || creditCap === undefined || earlyBps === undefined) return undefined;
    const hw = yourHighWater ?? 0n;
    const cappedNew = amountWei > creditCap ? creditCap : amountWei;
    const cappedOld = hw > creditCap ? creditCap : hw;
    const creditedDelta = cappedNew > cappedOld ? cappedNew - cappedOld : 0n;
    const weightAdded = (creditedDelta * earlyBps) / 10_000n;
    const newWeight = (yourWeight ?? 0n) + weightAdded;
    return { creditedDelta, weightAdded, newPoints: pointsFromWeight(newWeight) };
  }, [amountWei, creditCap, earlyBps, yourHighWater, yourWeight]);

  const [txError, setTxError] = useState<string | null>(null);

  // Contract custom errors arrive as raw signatures with wei args — translate the ones a user can hit.
  const friendlyError = (e: unknown): string | null => {
    const s = String((e as { message?: string })?.message ?? e);
    if (/user rejected|user denied|rejected the request/i.test(s)) return null;
    if (s.includes("OnlyEOA"))
      return "This wallet has code on it (Safe, smart account, or EIP-7702 delegation) — only plain EOAs can deposit. Use a regular wallet address.";
    if (s.includes("MustEscalate")) return `You must beat your own record: send at least ${fmtEth(requiredNext)} ETH.`;
    if (s.includes("AlreadySettled")) return "The game has settled — deposits are closed forever.";
    if (s.includes("AmountTooLarge")) return "That amount is larger than the contract accepts in one deposit.";
    return "Transaction failed — open the browser console for details.";
  };

  const handleDeposit = async () => {
    if (amountWei === undefined) return;
    setTxError(null);
    try {
      await writeCurator({ functionName: "deposit", value: amountWei });
      setAmountStr("");
      setFill(f => ({ nonce: f.nonce + 1, value: "" }));
    } catch (e) {
      console.error("deposit failed", e);
      setTxError(friendlyError(e));
    }
  };

  // ── leaderboard from Deposited events ──
  const { data: depositEvents, isLoading: eventsLoading } = useScaffoldEventHistory({
    contractName: "WhitelistCurator",
    eventName: "Deposited",
    watch: true,
    blocksBatchSize: 100000,
  });

  const leaderboard = useMemo(() => {
    const byAddr = new Map<string, { weight: bigint; txCount: bigint; highWater: bigint }>();
    for (const ev of depositEvents ?? []) {
      const { contributor, amount, newWeight, txCount } = ev.args as {
        contributor?: string;
        amount?: bigint;
        newWeight?: bigint;
        txCount?: bigint;
      };
      if (!contributor || newWeight === undefined) continue;
      const prev = byAddr.get(contributor);
      if (!prev || (txCount ?? 0n) > prev.txCount) {
        byAddr.set(contributor, { weight: newWeight, txCount: txCount ?? 0n, highWater: amount ?? 0n });
      }
    }
    return [...byAddr.entries()]
      .map(([addr, v]) => ({ addr, ...v, points: pointsFromWeight(v.weight) }))
      .sort((a, b) => (b.weight > a.weight ? 1 : b.weight < a.weight ? -1 : 0));
  }, [depositEvents]);

  // ── address lookup ──
  const [lookupAddr, setLookupAddr] = useState("");
  const validLookup = /^0x[0-9a-fA-F]{40}$/.test(lookupAddr) ? lookupAddr : undefined;
  const { data: lookupPoints } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "pointsOf",
    args: [validLookup],
  });
  const { data: lookupHighWater } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "contributedBy",
    args: [validLookup],
  });
  const { data: lookupFirstHour } = useScaffoldReadContract({
    contractName: "WhitelistCurator",
    functionName: "firstHourOf",
    args: [validLookup],
  });

  const multiplier = earlyBps !== undefined ? (Number(earlyBps) / 10_000).toFixed(2) : undefined;

  return (
    <div className="flex flex-col items-center grow w-full">
      {/* ───────────────────────── hero ───────────────────────── */}
      <div className="w-full bg-base-300/40 px-5 pt-10 pb-8 flex flex-col items-center text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-2">The Allowlist</h1>
        <p className="max-w-2xl text-lg opacity-80 m-0">
          A permissionless onchain allowlist of proven wallets. Send ETH — it comes straight back in the same
          transaction. What persists is the record: a whitelist for mints, an airdrop list, a reputation signal.
        </p>
        <div className="mt-4 flex gap-3 flex-wrap justify-center items-center">
          {settled === true ? (
            <span className="badge badge-error badge-lg gap-1 font-bold">SETTLED — list frozen forever</span>
          ) : settled === false ? (
            <span className="badge badge-success badge-lg gap-1 font-bold">
              <FireIcon className="h-4 w-4" /> LIVE
            </span>
          ) : (
            <span className="badge badge-ghost badge-lg">loading…</span>
          )}
          {multiplier && settled === false && (
            <span className="badge badge-warning badge-lg gap-1 font-semibold">
              <BoltIcon className="h-4 w-4" /> {multiplier}x early-bird multiplier
            </span>
          )}
        </div>
      </div>

      {/* ───────────────────────── survival clock ───────────────────────── */}
      <div className="w-full max-w-4xl px-5 -mt-6">
        <div className="bg-base-100 border border-base-300 rounded-2xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-3">
            <ClockIcon className="h-5 w-5" />
            <h2 className="text-lg font-bold m-0">
              Hour {currentHour !== undefined ? currentHour.toString() : "…"}
              {inGrace === true && firstJudgedHour !== undefined && (
                <span className="ml-2 badge badge-info badge-sm align-middle">
                  grace period — judging starts at hour {firstJudgedHour.toString()}
                </span>
              )}
            </h2>
            <span className="ml-auto font-mono text-xl tabular-nums">
              {secsLeftInHour !== undefined ? fmtDuration(secsLeftInHour) : "…"}
              <span className="text-xs opacity-60 ml-1">left in hour</span>
            </span>
          </div>

          {inGrace === false && settled === false && (
            <>
              <div className="flex justify-between text-sm mb-1">
                <span>
                  {fmtEth(currentHourTotal)} / {fmtEth(hourlyThreshold)} ETH this hour
                </span>
                <span
                  className={
                    ethNeeded !== undefined && ethNeeded > 0n ? "text-error font-bold" : "text-success font-bold"
                  }
                >
                  {ethNeeded !== undefined && ethNeeded > 0n
                    ? `${fmtEth(ethNeeded)} ETH${usd(ethNeeded)} still needed or it settles`
                    : "hour is safe ✓"}
                </span>
              </div>
              <progress
                className={`progress w-full ${hourPct >= 100 ? "progress-success" : "progress-error"}`}
                value={hourPct}
                max={100}
              />
              <p className="text-xs opacity-70 mt-2 m-0">
                Every completed hour must take in {fmtEth(hourlyThreshold)} ETH of deposits or the contract settles
                permanently and the list freezes. A silent hour is a failed hour.
              </p>
            </>
          )}
          {inGrace === true && graceEndsAt !== undefined && (
            <p className="text-sm opacity-80 m-0">
              Anything goes until <span className="font-semibold">{new Date(graceEndsAt * 1000).toLocaleString()}</span>
              . After that, every clock hour must pull in {fmtEth(hourlyThreshold)} ETH or the contract settles —
              permanently. The early-bird multiplier decays from 2x to 1x over this window, so earlier weight is worth
              more.
            </p>
          )}
          {settled === true && (
            <p className="text-sm m-0">
              The game has ended. The list is frozen forever and can be read onchain by any gating contract. No record
              can be altered.
            </p>
          )}
        </div>
      </div>

      {/* ───────────────────────── global stats ───────────────────────── */}
      <div className="flex flex-wrap gap-4 justify-center mt-8 px-5">
        <Stat
          label="Volume cycled"
          value={`${fmtEth(stats?.[0], 2)} ETH`}
          sub={`all of it refunded${usd(stats?.[0])}`}
        />
        <Stat label="Wallets on the list" value={stats?.[1]?.toString() ?? "…"} />
        <Stat label="Deposits" value={stats?.[2]?.toString() ?? "…"} />
      </div>

      {/* ───────────────────────── your standing + deposit ───────────────────────── */}
      <div className="w-full max-w-4xl px-5 mt-10 grid md:grid-cols-2 gap-6">
        <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrophyIcon className="h-5 w-5" />
            <h2 className="text-lg font-bold m-0">Your standing</h2>
          </div>
          {connectedAddress ? (
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="opacity-70">Points</span>
                <span className="font-bold text-xl">{yourPoints !== undefined ? yourPoints.toString() : "…"}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Weight</span>
                <span className="font-mono">{fmtEth(yourWeight)} Ξ-equiv</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">High-water mark (largest single send)</span>
                <span className="font-mono">{fmtEth(yourHighWater)} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Recorded deposits</span>
                <span className="font-mono">{yourTxCount !== undefined ? yourTxCount.toString() : "…"}</span>
              </div>
              <div className="flex justify-between border-t border-base-300 pt-2 mt-1">
                <span className="opacity-70">Next deposit must be ≥</span>
                <span className="font-mono font-bold">
                  {fmtEth(requiredNext)} ETH{usd(requiredNext)}
                </span>
              </div>
              <p className="text-xs opacity-70 m-0 mt-1">
                Escalation rule: every deposit must beat your own record by at least {fmtEth(minEscalation)} ETH, and
                only the delta above your record is credited. Repeat sends of the same size are worthless.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="opacity-70 m-0">See your record and play:</p>
              <RainbowKitCustomConnectButton />
            </div>
          )}
        </div>

        <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <ArrowPathIcon className="h-5 w-5" />
            <h2 className="text-lg font-bold m-0">Deposit (instantly refunded)</h2>
          </div>
          {settled === true ? (
            <p className="opacity-70 m-0">The contract has settled — deposits are closed forever.</p>
          ) : (
            <>
              <EtherInput
                key={fill.nonce}
                defaultValue={fill.value}
                onValueChange={({ valueInEth }) => setAmountStr(valueInEth)}
                placeholder={`min ${fmtEth(requiredNext ?? minDeposit)} ETH`}
              />
              <div className="flex gap-2 mt-2">
                <button
                  className="btn btn-xs btn-ghost border-base-300"
                  disabled={requiredNext === undefined}
                  onClick={() => requiredNext !== undefined && quickFill(requiredNext)}
                >
                  exact minimum ({fmtEth(requiredNext)})
                </button>
                {ethNeeded !== undefined && ethNeeded > 0n && (
                  <button
                    className="btn btn-xs btn-ghost border-base-300 text-error"
                    onClick={() =>
                      quickFill(requiredNext !== undefined && ethNeeded < requiredNext ? requiredNext : ethNeeded)
                    }
                  >
                    save the hour ({fmtEth(ethNeeded)})
                  </button>
                )}
              </div>
              {preview && meetsMinimum && (
                <div className="text-xs bg-base-200 rounded-lg p-3 mt-3 flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Credited delta</span>
                    <span className="font-mono">{fmtEth(preview.creditedDelta)} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Weight added ({multiplier}x)</span>
                    <span className="font-mono">{fmtEth(preview.weightAdded)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Points after</span>
                    <span className="font-mono">
                      {preview.newPoints.toString()}
                      {yourPoints !== undefined && preview.newPoints > yourPoints && (
                        <span className="text-success"> (+{(preview.newPoints - yourPoints).toString()})</span>
                      )}
                    </span>
                  </div>
                  {inGrace === true && (
                    <p className="opacity-60 m-0 mt-1">
                      Estimate at the current {multiplier}x multiplier — it decays until hour{" "}
                      {firstJudgedHour?.toString() ?? "…"}, so the credited weight at inclusion may be slightly lower.
                    </p>
                  )}
                </div>
              )}
              {amountWei !== undefined && !meetsMinimum && requiredNext !== undefined && (
                <p className="text-error text-xs mt-2 m-0">
                  Must send at least {fmtEth(requiredNext)} ETH (your record + {fmtEth(minEscalation)} escalation).
                </p>
              )}
              {!connectedAddress ? (
                <div className="flex justify-center mt-3">
                  <RainbowKitCustomConnectButton />
                </div>
              ) : wrongNetwork ? (
                <button
                  className="btn btn-warning w-full mt-3"
                  disabled={isSwitching}
                  onClick={() => switchChain({ chainId: mainnet.id })}
                >
                  {isSwitching ? <span className="loading loading-spinner loading-sm" /> : null}
                  {isSwitching ? "switching…" : "Switch to Ethereum"}
                </button>
              ) : (
                <button
                  className="btn btn-primary w-full mt-3"
                  disabled={!meetsMinimum || isMining}
                  onClick={handleDeposit}
                >
                  {isMining ? <span className="loading loading-spinner loading-sm" /> : null}
                  {isMining ? "confirming…" : "Send it (you get it right back)"}
                </button>
              )}
              {txError && <p className="text-error text-xs mt-2 m-0">{txError}</p>}
              <p className="text-xs opacity-70 mt-2 m-0">
                The full amount is refunded to you inside the same transaction — the contract never keeps a wei. You
                spend gas; the chain remembers you held the ETH.
              </p>
            </>
          )}
        </div>
      </div>

      {/* ───────────────────────── warnings ───────────────────────── */}
      <div className="w-full max-w-4xl px-5 mt-6">
        <div className="bg-warning/10 border border-warning rounded-2xl p-5 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-warning" />
            <h3 className="font-bold m-0">Before you burn gas</h3>
          </div>
          <ul className="m-0 pl-5 flex flex-col gap-1">
            <li>
              <span className="font-semibold">Plain EOAs only.</span> Safe multisigs, ERC-4337 smart accounts and
              EIP-7702 delegated EOAs all revert with <code>OnlyEOA</code>. If your address has code, it cannot play.
            </li>
            <li>
              <span className="font-semibold">Use a normal wallet send.</span> A 2300-gas <code>transfer</code>/
              <code>send</code> into this contract will fail — the deposit path costs far more than the stipend.
            </li>
            <li>
              <span className="font-semibold">Credit caps at {fmtEth(creditCap, 0)} ETH.</span> Deposits above the cap
              still count toward hourly survival but add zero weight.
            </li>
            <li>
              <span className="font-semibold">Points follow a square root.</span> 1 ETH of weight = 1,000 points; 1000x
              the capital buys ~31x the points. First deposit ≥ {fmtEth(minDeposit)} ETH.
            </li>
          </ul>
        </div>
      </div>

      {/* ───────────────────────── leaderboard ───────────────────────── */}
      <div className="w-full max-w-4xl px-5 mt-10 mb-6">
        <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrophyIcon className="h-5 w-5" />
            <h2 className="text-lg font-bold m-0">Leaderboard</h2>
            <span className="ml-auto text-xs opacity-60">
              {leaderboard.length} wallets · rebuilt live from <code>Deposited</code> events
            </span>
          </div>
          {eventsLoading && leaderboard.length === 0 ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Wallet</th>
                    <th className="text-right">Points</th>
                    <th className="text-right">Weight (Ξ)</th>
                    <th className="text-right">High-water</th>
                    <th className="text-right">Txs</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.slice(0, 50).map((row, i) => (
                    <tr key={row.addr} className={row.addr === connectedAddress ? "bg-primary/10" : ""}>
                      <td className="font-mono">{i + 1}</td>
                      <td>
                        <Address address={row.addr} size="sm" />
                      </td>
                      <td className="text-right font-bold font-mono">{row.points.toString()}</td>
                      <td className="text-right font-mono">{fmtEth(row.weight, 3)}</td>
                      <td className="text-right font-mono">{fmtEth(row.highWater, 3)}</td>
                      <td className="text-right font-mono">{row.txCount.toString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────── address lookup ───────────────────────── */}
      <div className="w-full max-w-4xl px-5 mb-10">
        <div className="bg-base-100 border border-base-300 rounded-2xl p-6">
          <h2 className="text-lg font-bold mt-0 mb-3">Check any wallet</h2>
          <AddressInput value={lookupAddr} onChange={setLookupAddr} placeholder="0x… address to look up" />
          {validLookup && (
            <div className="flex flex-wrap gap-6 mt-4 text-sm">
              <span>
                Points: <span className="font-bold">{lookupPoints !== undefined ? lookupPoints.toString() : "…"}</span>
              </span>
              <span>
                High-water: <span className="font-mono">{fmtEth(lookupHighWater)} ETH</span>
              </span>
              <span>
                {lookupFirstHour?.[1]
                  ? `First seen: hour ${lookupFirstHour[0].toString()}`
                  : lookupFirstHour
                    ? "Never deposited"
                    : "…"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────── footer note ───────────────────────── */}
      <div className="w-full max-w-4xl px-5 mb-12 text-center text-xs opacity-70">
        <div className="flex justify-center items-center gap-2 flex-wrap">
          <span>WhitelistCurator on Ethereum mainnet:</span>
          <Address address="0xcB0b0531e86A9aC36Fa865cA8e3dbccF047FDA91" size="sm" chain={mainnet} />
        </div>
        <p className="m-0 mt-1">
          <a
            className="link"
            href="https://etherscan.io/address/0xcB0b0531e86A9aC36Fa865cA8e3dbccF047FDA91#code"
            target="_blank"
            rel="noreferrer"
          >
            verified source
          </a>{" "}
          · immutable, no owner, no upgrade path · built with 🏗 Scaffold-ETH 2 —{" "}
          <a
            className="link"
            href="https://github.com/clawdbotatg/allowlists-frontend"
            target="_blank"
            rel="noreferrer"
          >
            fork this frontend
          </a>
        </p>
      </div>
    </div>
  );
};

export default Home;

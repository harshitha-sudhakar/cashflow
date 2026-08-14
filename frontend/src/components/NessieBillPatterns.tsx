// import { useEffect, useState } from "react";
// import type { BillPatternSummary } from "../lib/types";

// const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "";
// const accountId = import.meta.env.VITE_NESSIE_ACCOUNT_ID as string | undefined;

// async function fetchNessiePatterns() {
//   const paths = [
//     `${backendUrl}/api/test-nessie/patterns/${accountId}`,
//     `http://localhost:4000/api/test-nessie/patterns/${accountId}`,
//   ];

//   let lastError: unknown;

//   for (const path of paths) {
//     try {
//       return await fetch(path);
//     } catch (error) {
//       lastError = error;
//     }
//   }

//   throw lastError instanceof Error ? lastError : new Error("Failed to reach Nessie history endpoint");
// }

// export function NessieBillPatterns() {
//   const [patterns, setPatterns] = useState<BillPatternSummary[]>([]);
//   const [loading, setLoading] = useState(Boolean(accountId));
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     if (!accountId) {
//       setLoading(false);
//       return;
//     }

//     async function load() {
//       try {
//         setError(null);
//         const response = await fetchNessiePatterns();
//         if (!response.ok) {
//           throw new Error(`Failed to load Nessie patterns (${response.status})`);
//         }

//         const data = (await response.json()) as BillPatternSummary[];
//         setPatterns(data);
//       } catch (fetchError) {
//         setError((fetchError as Error).message);
//       } finally {
//         setLoading(false);
//       }
//     }

//     load();
//   }, []);

//   return (
//     <div className="card compact-card">
//       <div className="card-headline-row">
//         <div>
//           <h2 className="card-title">Nessie bill intelligence</h2>
//           <p className="card-subtitle">Auto-detected timing and amount patterns from historical bills.</p>
//         </div>
//         <span className="card-pill">Live data</span>
//       </div>

//       {!accountId ? (
//         <p className="card-subtitle">No Nessie account is configured yet.</p>
//       ) : loading ? (
//         <p className="card-subtitle">Analyzing bills...</p>
//       ) : error ? (
//         <p className="auth-error">Nessie history is unavailable right now.</p>
//       ) : patterns.length === 0 ? (
//         <p className="card-subtitle">No recurring bill patterns were detected yet.</p>
//       ) : (
//         <div className="pattern-grid">
//           {patterns.slice(0, 3).map((pattern) => (
//             <article key={pattern.payee} className="pattern-card">
//               <div className="pattern-topline">
//                 <strong>{pattern.payee}</strong>
//                 <span>{pattern.count} bills</span>
//               </div>
//               <p>
//                 Lands between the {pattern.recurrenceWindow.minDay}th and {pattern.recurrenceWindow.maxDay}th.
//               </p>
//               <div className="pattern-amount">Avg ${pattern.averageAmount.toFixed(2)}</div>
//               <div className="pattern-months">
//                 {pattern.seasonalProjection.slice(0, 4).map((entry) => (
//                   <span key={`${pattern.payee}-${entry.month}`}>
//                     {entry.monthLabel} ${entry.averageAmount.toFixed(0)}
//                   </span>
//                 ))}
//               </div>
//             </article>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }
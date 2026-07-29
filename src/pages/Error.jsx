// app/error.jsx

import { Link, useRouteError } from 'react-router-dom';
import BG from '../components/BG';
import FlightLayout from '../components/FlightLayout';

export default function ErrorPage() {
  const error = useRouteError();
  console.error(error);

  const code = error.status || "ERR";
  return (
    <>
      <BG />

      <FlightLayout title="ERROR" footer="SYSTEM FAILURE">
        <div className="font-mono px-4 py-6 space-y-6">

          {/* Alert header */}
          <div className="flex gap-2">

            {/* Code box */}
            <div className="border border-[#FF3131]/80 bg-[#FF3131]/5 px-2 py-2 flex items-center justify-center shrink-0">
              <p className="text-[#FF3131] text-xl font-bold tracking-widest">{code}</p>
            </div>

            {/* Text box */}
            <div className="border border-[#FF3131]/80 bg-[#FF3131]/5 px-2 py-2 flex items-center justify-center flex-1">
              <div className="space-y-0.5 text-center">
                <p className="text-[#FF3131] text-[11px] tracking-[0.35em] uppercase font-bold">System Fault Detected</p>
                <p className="text-[#CCF2FF] text-[11px] tracking-[0.25em] uppercase">Navigation Unavailable</p>
              </div>
            </div>

          </div>

          <div className="border-l-2 border-[#FF3131]/30 pl-4 space-y-2">
            <p className="text-[#CCF2FF] text-xs tracking-[0.15em]">An unexpected error has occurred.</p>
          </div>

          <div className="border-l-2 border-[#FF3131]/30 pl-4 space-y-2">
            <p className="text-[#CCF2FF] text-xs tracking-widest italic">ISSUE:  {error.statusText || error.message}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[#FF3131] text-[11px] tracking-[0.25em] uppercase"> — Contact support or </p>
            <Link to="/" className="block text-[#00B4FF] text-[11px] tracking-[0.25em] uppercase hover:text-[#CCF2FF] transition-colors">
              ▸ Return to Home
            </Link>
          </div>
        </div>
      </FlightLayout>
    </>
  );
}
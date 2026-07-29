//src/pages/Contact.jsx

import { Link } from 'react-router-dom';
import BG from '../components/BG';
import FlightLayout from '../components/FlightLayout';

export default function Contact() {
    return (
        <>

            <BG />

            <FlightLayout title="CONTACT" footer="SYSTEM ONLINE">

                <div className="font-mono text-[#39ff14]/80">

                    <div className="text-left py-2 mx-auto inline-block text-xs tracking-[0.2em]">
                        <p className="space-y-1 text-white/90">
                            Contact information will go here.
                        </p>
                    </div>

                </div>

            </FlightLayout>

        </>
    )
}

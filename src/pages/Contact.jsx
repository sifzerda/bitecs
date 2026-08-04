//src/pages/Contact.jsx

import { useState } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import BG from '../components/BG';
import FlightLayout from '../components/FlightLayout';

export default function Contact() {
    const [status, setStatus] = useState('');
    const [captchaToken, setCaptchaToken] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();

        if (!captchaToken) {
            setStatus('PLEASE COMPLETE CAPTCHA');
            return;
        }

        setStatus('TRANSMITTING...');

        const formData = new FormData(e.target);

        console.log("Captcha token:", captchaToken);

        formData.append('access_key', import.meta.env.VITE_WEB3FORMS_ACCESS_KEY);
        // hCaptcha token
        formData.append('h-captcha-response', captchaToken);

        const response = await fetch(
            'https://api.web3forms.com/submit',
            {
                method: 'POST',
                body: formData,
            }
        );

        const data = await response.json();

if (data.success) {
    setStatus('MESSAGE TRANSMITTED');
    e.target.reset();
    setCaptchaToken('');
} else {
    console.error(data);
    setStatus(data.message || 'TRANSMISSION FAILED');
}
    }

    return (
        <>
            <BG />

            <FlightLayout title="CONTACT ME" footer="SYSTEM ONLINE">

                <div className="mt-3 mx-auto max-w-md font-mono text-center">

                    <form onSubmit={handleSubmit} className="space-y-4 flex flex-col items-center">

                        <input
                            type="text"
                            name="name"
                            placeholder="NAME"
                            required
                            className="w-full border border-[#39ff14]/40 bg-black/30 px-3 py-2 text-xs tracking-[0.2em] text-white outline-none focus:border-[#39ff14]"
                        />

                        <textarea
                            name="message"
                            placeholder="MESSAGE"
                            rows={9}
                            required
                            className="w-full resize-none border border-[#39ff14]/40 bg-black/30 px-3 py-2 text-xs tracking-[0.2em] text-white outline-none focus:border-[#39ff14]"
                        />

                        <div className="flex justify-center">
                            <HCaptcha
                                sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY}
                                onVerify={(token) => setCaptchaToken(token)}
                                onExpire={() => setCaptchaToken('')}
                            />
                        </div>

                        <button type="submit"
                            className="border border-[#39ff14] px-6 py-2 text-xs tracking-[0.25em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black">
                            SEND MESSAGE
                        </button>

                    </form>

                    {status && (
                        <p className="mt-4 text-xs tracking-[0.2em] text-[#39ff14]">
                            {status}
                        </p>
                    )}

                </div>
            </FlightLayout>
        </>
    );
}
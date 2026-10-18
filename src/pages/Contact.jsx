//src/pages/Contact.jsx

import { useRef, useState } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import BG from '../components/BG';
import FlightLayout from '../components/FlightLayout';

// Web3Forms verifies the captcha on its side, so on the free plan the widget
// must use THEIR public sitekey, not one from your own hCaptcha account.
// Read from .env, with the Web3Forms key as a fallback so it never goes missing.
const WEB3FORMS_HCAPTCHA_SITEKEY =
    import.meta.env.VITE_HCAPTCHA_SITE_KEY || '50b2fe65-b00b-4b9e-ad62-3ba471098be2';

export default function Contact() {
    const [status, setStatus] = useState('');
    const [captchaToken, setCaptchaToken] = useState('');
    const [sending, setSending] = useState(false);
    const captchaRef = useRef(null);

    function resetCaptcha() {
        setCaptchaToken('');
        captchaRef.current?.resetCaptcha();
    }

    async function handleSubmit(e) {
        e.preventDefault();

        // Grab the form now; e.currentTarget is null after an await.
        const form = e.currentTarget;

        if (!captchaToken) {
            setStatus('PLEASE COMPLETE CAPTCHA');
            return;
        }

        setSending(true);
        setStatus('TRANSMITTING...');

        try {
            const formData = new FormData(form);

            formData.append('access_key', import.meta.env.VITE_WEB3FORMS_ACCESS_KEY);
            formData.append('h-captcha-response', captchaToken);

            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setStatus('MESSAGE TRANSMITTED');
                form.reset();
            } else {
                console.error(data);
                setStatus(data.message || 'TRANSMISSION FAILED');
            }
        } catch (err) {
            console.error(err);
            setStatus('TRANSMISSION FAILED');
        } finally {
            // A captcha token is single-use, so always get a fresh one.
            resetCaptcha();
            setSending(false);
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
                                ref={captchaRef}
                                sitekey={WEB3FORMS_HCAPTCHA_SITEKEY}
                                reCaptchaCompat={false}
                                theme="dark"
                                onVerify={(token) => setCaptchaToken(token)}
                                onExpire={() => setCaptchaToken('')}
                                onError={(err) => {
                                    console.error('hCaptcha error:', err);
                                    setCaptchaToken('');
                                    setStatus('CAPTCHA ERROR, TRY AGAIN');
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={sending}
                            className="border border-[#39ff14] px-6 py-2 text-xs tracking-[0.25em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {sending ? 'SENDING...' : 'SEND MESSAGE'}
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
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  username: z.string().min(1, "กรุณากรอก Username"),
  password: z.string().min(1, "กรุณากรอก Password"),
});
type FormValues = z.infer<typeof schema>;

const ROLE_HOME: Record<string, string> = {
  student: "/dashboard",
  professor: "/professor/dashboard",
  admin: "/admin/users",
};

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    setApiError("");
    setIsLoading(true);
    try {
      const res = await login(data);
      router.replace(ROLE_HOME[res.role] ?? "/dashboard");
    } catch {
      setApiError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .login-root {
          min-height: 100svh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          font-family: var(--font-dm-sans), var(--font-sarabun), system-ui, sans-serif;
          background:
            radial-gradient(ellipse 80% 70% at 15% 10%,  #ff9a7a 0%, transparent 55%),
            radial-gradient(ellipse 60% 60% at 88% 20%,  #f26b3a 0%, transparent 50%),
            radial-gradient(ellipse 70% 60% at 80% 85%,  #7b5ea7 0%, transparent 55%),
            radial-gradient(ellipse 55% 55% at 5%  90%,  #e8845a 0%, transparent 50%),
            radial-gradient(ellipse 90% 90% at 50% 50%,  #ffe0c8 0%, transparent 70%),
            #f5c9a8;
        }

        .liquid-layer {
          position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 50% 40% at 70% 30%, rgba(255,255,255,0.35) 0%, transparent 60%),
            radial-gradient(ellipse 40% 35% at 20% 70%, rgba(255,255,255,0.2)  0%, transparent 55%);
          animation: liquid-shift 12s ease-in-out infinite;
        }
        @keyframes liquid-shift {
          0%,100% { opacity:1;   transform: scale(1)    translate(0,0); }
          33%      { opacity:.8; transform: scale(1.04) translate(-16px,12px); }
          66%      { opacity:.9; transform: scale(0.97) translate(12px,-8px); }
        }

        .noise-layer {
          position: absolute; inset: 0; pointer-events: none; opacity: .055;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 180px 180px;
        }

        /* ── Form container ── */
        .form-wrap {
          position: relative; z-index: 10;
          width: 100%; max-width: 400px;
          padding: 24px 20px 96px;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity .55s cubic-bezier(.23,1,.32,1), transform .55s cubic-bezier(.23,1,.32,1);
        }
        .form-wrap.in { opacity: 1; transform: translateY(0); }

        /* ── Logo chip ── */
        .logo-chip { display:flex; align-items:center; justify-content:center; margin-bottom:32px; }
        .chip-pill {
          display:inline-flex; align-items:center; gap:10px;
          padding:7px 16px 7px 8px; border-radius:99px;
          background:rgba(255,255,255,0.38);
          border:1px solid rgba(255,255,255,0.7);
          backdrop-filter:blur(20px) saturate(180%);
          -webkit-backdrop-filter:blur(20px) saturate(180%);
          box-shadow:0 1px 0 rgba(255,255,255,0.8) inset, 0 4px 16px rgba(180,60,20,0.12);
        }
        .chip-icon {
          width:30px; height:30px; border-radius:9px; flex-shrink:0;
          background:linear-gradient(135deg,#8f2a15,#AC3520,#c94030);
          box-shadow:0 2px 8px rgba(172,53,32,0.4);
          display:flex; align-items:center; justify-content:center;
        }
        .chip-label { font-size:12.5px; font-weight:600; color:rgba(80,30,10,0.65); }

        /* ── Headline ── */
        .headline { text-align:center; margin-bottom:5px; }
        .headline h1 {
          font-size:clamp(36px,8vw,44px);
          font-weight:700; color:#2a0f06;
          letter-spacing:-0.045em; line-height:1; margin:0;
          text-shadow:0 1px 0 rgba(255,255,255,0.4);
        }
        .headline h1 em { font-style:normal; color:#AC3520; }
        .subline {
          text-align:center; font-size:13px;
          color:rgba(60,20,10,0.45); margin-bottom:28px;
          font-family:var(--font-sarabun),'Sarabun',sans-serif;
        }

        /* ── Glass card ── */
        .glass-card {
          background:rgba(255,255,255,0.42);
          border:1px solid rgba(255,255,255,0.75);
          border-radius:26px; padding:28px;
          backdrop-filter:blur(40px) saturate(200%) brightness(1.08);
          -webkit-backdrop-filter:blur(40px) saturate(200%) brightness(1.08);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.9) inset,
            1px 0 0 rgba(255,255,255,0.5) inset,
            0 24px 64px rgba(140,50,10,0.18),
            0 6px 20px rgba(0,0,0,0.06);
        }

        /* ── Fields ── */
        .field { margin-bottom:18px; }
        .flabel {
          display:block; font-size:10.5px; font-weight:700;
          color:rgba(60,20,10,0.45); letter-spacing:0.09em;
          text-transform:uppercase; margin-bottom:7px;
        }
        .finput-wrap { position:relative; }
        .finput {
          width:100%; height:48px;
          background:rgba(255,255,255,0.5);
          border:1px solid rgba(255,255,255,0.8);
          border-radius:13px; padding:0 16px;
          font-size:14px; color:#2a0f06; outline:none;
          transition:border-color .18s, box-shadow .18s, background .18s;
          caret-color:#AC3520;
          font-family:var(--font-dm-mono),'DM Mono',monospace;
          backdrop-filter:blur(8px);
          box-shadow:0 1px 0 rgba(255,255,255,0.9) inset;
        }
        .finput::placeholder {
          color:rgba(60,20,10,0.28);
          font-family:var(--font-dm-sans),'DM Sans',sans-serif;
          font-size:13px;
        }
        .finput:focus {
          border-color:rgba(172,53,32,0.45);
          background:rgba(255,255,255,0.7);
          box-shadow:0 1px 0 rgba(255,255,255,0.9) inset, 0 0 0 3px rgba(172,53,32,0.12);
        }
        .finput.err {
          border-color:rgba(220,50,50,0.35);
          box-shadow:0 0 0 3px rgba(220,50,50,0.07);
        }
        .ferr { font-size:11px; color:rgba(180,40,30,0.8); margin-top:5px; font-family:var(--font-sarabun),'Sarabun',sans-serif; }
        .eye-btn {
          position:absolute; right:12px; top:50%; transform:translateY(-50%);
          background:none; border:none; cursor:pointer;
          color:rgba(60,20,10,0.3); padding:4px; border-radius:6px;
          display:flex; align-items:center; justify-content:center; transition:color .15s;
        }
        .eye-btn:hover { color:rgba(60,20,10,0.6); }

        /* ── Error banner ── */
        .err-banner {
          display:flex; align-items:center; gap:9px;
          background:rgba(172,53,32,0.08);
          border:1px solid rgba(172,53,32,0.2);
          border-radius:12px; padding:11px 14px;
          font-size:13px; color:#AC3520;
          margin-bottom:16px;
          font-family:var(--font-sarabun),'Sarabun',sans-serif;
        }

        /* ── CTA ── */
        .cta-btn {
          width:100%; height:50px; margin-top:6px;
          border:none; border-radius:13px; cursor:pointer;
          background:linear-gradient(135deg,#AC3520,#c94030);
          color:#fff; font-size:15px; font-weight:600; letter-spacing:-0.01em;
          display:flex; align-items:center; justify-content:center; gap:8px;
          position:relative; overflow:hidden;
          transition:transform .15s, box-shadow .2s, opacity .2s;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.18),
            0 4px 20px rgba(172,53,32,0.32);
          font-family:var(--font-dm-sans),'DM Sans',sans-serif;
        }
        .cta-btn:not(:disabled):hover {
          transform:translateY(-1px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.2),
            0 8px 28px rgba(172,53,32,0.42);
        }
        .cta-btn:not(:disabled):active { transform:translateY(0); }
        .cta-btn:disabled { opacity:.55; cursor:not-allowed; }
        .cta-btn .sheen {
          position:absolute; top:0; left:-100%; width:55%; height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);
          transition:left .5s ease;
        }
        .cta-btn:not(:disabled):hover .sheen { left:160%; }

        /* ── Divider ── */
        .hdivider { display:flex; align-items:center; gap:12px; margin-top:22px; }
        .hdivider-line { flex:1; height:1px; background:rgba(172,53,32,0.12); }
        .hdivider-txt { font-size:11px; color:rgba(60,20,10,0.32); font-family:var(--font-sarabun),'Sarabun',sans-serif; white-space:nowrap; }

        /* ── Footer ── */
        .form-footer {
          text-align:center; font-size:12px; color:rgba(60,20,10,0.38);
          margin-top:22px; font-family:var(--font-sarabun),'Sarabun',sans-serif;
        }
        .form-footer button {
          background:none; border:none; cursor:pointer;
          color:#AC3520; font-size:12px; font-weight:600;
          font-family:var(--font-sarabun),'Sarabun',sans-serif;
          padding:0; transition:opacity .15s;
        }
        .form-footer button:hover { opacity:.7; }

        /* ── Stat strip ── */
        .stat-strip {
          position:absolute; bottom:28px; left:50%; transform:translateX(-50%);
          display:flex; align-items:stretch; z-index:10;
          background:rgba(255,255,255,0.38);
          border:1px solid rgba(255,255,255,0.72);
          border-radius:99px;
          backdrop-filter:blur(24px) saturate(180%);
          -webkit-backdrop-filter:blur(24px) saturate(180%);
          overflow:hidden; white-space:nowrap;
          box-shadow:0 1px 0 rgba(255,255,255,0.85) inset, 0 4px 20px rgba(140,50,10,0.1);
          opacity:0; transition:opacity .8s ease .4s;
        }
        .stat-strip.in { opacity:1; }
        .sitem { display:flex; flex-direction:column; align-items:center; padding:7px 22px; }
        .sitem + .sitem { border-left:1px solid rgba(172,53,32,0.1); }
        .sval { font-size:12.5px; font-weight:700; color:rgba(50,15,5,0.65); letter-spacing:-0.02em; }
        .slbl { font-size:9.5px; color:rgba(50,15,5,0.38); margin-top:1px; font-family:var(--font-sarabun),'Sarabun',sans-serif; }
      `}</style>

      <div className="login-root">
        <div className="liquid-layer" />
        <div className="noise-layer" />

        <div className={cn("form-wrap", mounted && "in")}>
          {/* Logo chip */}
          <div className="logo-chip">
            <div className="chip-pill">
              <div className="chip-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z"
                    fill="white"
                  />
                  <path
                    d="M9 12l2 2 4-4"
                    stroke="#AC3520"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="chip-label">KMUTNB · AllU Academic</span>
            </div>
          </div>

          <div className="headline">
            <h1>
              เข้าสู่<em>ระบบ</em>
            </h1>
          </div>
          <p className="subline">
            ระบบบริหารจัดการการศึกษา มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ
          </p>

          <div className="glass-card">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="field">
                <label className="flabel">Username</label>
                <div className="finput-wrap">
                  <input
                    className={cn("finput", errors.username && "err")}
                    placeholder="เช่น 66040626..."
                    autoComplete="username"
                    {...register("username")}
                  />
                </div>
                {errors.username && (
                  <p className="ferr">⚠ {errors.username.message}</p>
                )}
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label className="flabel">Password</label>
                <div className="finput-wrap">
                  <input
                    className={cn("finput", errors.password && "err")}
                    style={{ paddingRight: 44 }}
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowPass((p) => !p)}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="ferr">⚠ {errors.password.message}</p>
                )}
              </div>

              {apiError && (
                <div className="err-banner" style={{ marginTop: 16 }}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {apiError}
                </div>
              )}

              <button type="submit" className="cta-btn" disabled={isLoading}>
                <span className="sheen" />
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>กำลังเข้าสู่ระบบ...</span>
                  </>
                ) : (
                  <>
                    <span>เข้าสู่ระบบ</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="hdivider">
              <div className="hdivider-line" />
              <span className="hdivider-txt">ระบบสารสนเทศ มจพ.</span>
              <div className="hdivider-line" />
            </div>
          </div>

          <p className="form-footer">
            ลืมรหัสผ่าน?{" "}
            <button type="button">ติดต่อสำนักทะเบียนและประมวลผล</button>
          </p>
        </div>

        {/* Stat strip */}
        <div className={cn("stat-strip", mounted && "in")}>
          {[
            { val: "15,000+", lbl: "นักศึกษา" },
            { val: "800+", lbl: "รายวิชา" },
            { val: "600+", lbl: "อาจารย์" },
            { val: "120+", lbl: "สาขาวิชา" },
          ].map((s) => (
            <div key={s.lbl} className="sitem">
              <span className="sval">{s.val}</span>
              <span className="slbl">{s.lbl}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

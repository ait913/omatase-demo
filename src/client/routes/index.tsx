import { Link } from "@tanstack/react-router";
import { Button } from "../components/Section";

export function LandingRoute() {
  return (
    <div className="flex min-h-dvh flex-col justify-center p-8">
      <div className="mx-auto mb-6 grid size-[60px] place-items-center rounded-full bg-brand-500 text-3xl text-white">+</div>
      <h1 className="text-center text-3xl font-bold">OMATASE</h1>
      <p className="mt-4 text-center text-base leading-7 text-ink-500">URLひとつで、<br />待ち合わせがまとまる。</p>
      <ul className="mt-8 space-y-3 text-ink-900">
        <li>・地図で集合場所を共有</li>
        <li>・進行を全員でなぞる</li>
        <li>・持ち物も忘れない</li>
      </ul>
      <Link to="/create" className="mt-10">
        <Button className="w-full">+ イベントを作る</Button>
      </Link>
      <p className="mt-5 text-center text-sm text-ink-500">既にURLを持っている方は<br />共有された URL を開く</p>
    </div>
  );
}

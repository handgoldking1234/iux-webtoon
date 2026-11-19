import Link from 'next/link';
export default function NotFound() {
  return <div className="center"><div className="authcard"><h1>페이지를 찾을 수 없어요</h1><Link className="btn pri" href="/">처음으로</Link></div></div>;
}

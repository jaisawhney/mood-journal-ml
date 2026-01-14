import { Link } from "react-router-dom";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
            <p className="text-lg text-slate-600 mb-6">Sorry, the page you are looking for does not exist.</p>
            <Link to="/" className="btn bg-white text-slate-800">Go Home</Link>
        </div>
    );
}

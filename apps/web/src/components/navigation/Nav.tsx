import { History, NotebookPen, Smile } from 'lucide-react';
import NavItem from '../ui/NavItem';

export default function Nav() {
    return (
        <>
            <nav className='fixed bottom-0 left-0 right-0 h-16 border-t border-gray-200 bg-white' aria-label='Main navigation'>
                <div className='flex h-full items-center justify-around'>
                    <NavItem to='/' icon={Smile} label='Insights' />
                    <NavItem to='/journal' icon={NotebookPen} label='Journal' />
                    <NavItem to='/entries' icon={History} label='History' />
                </div>
            </nav>
        </>
    )
}

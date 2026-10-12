// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {ReloadAppEntry} from '@/components/pwa/ReloadAppEntry';
const restart=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/pwa/app-updates',()=>({requestAppRestart:restart}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();restart.mockClear();});
function mode(matches:boolean){vi.stubGlobal('matchMedia',()=>({matches,addEventListener:vi.fn(),removeEventListener:vi.fn()}));}
it('only offers refresh in standalone',()=>{mode(false);render(<ReloadAppEntry onActivate={()=>{}} className="menu-item"/>);expect(screen.queryByRole('button')).toBeNull();});
it('closes the menu before requesting a safe restart',()=>{mode(true);const close=vi.fn();restart.mockImplementationOnce(()=>expect(close).toHaveBeenCalledOnce());render(<ReloadAppEntry onActivate={close} className="menu-item"/>);fireEvent.click(screen.getByRole('button',{name:'Оновити застосунок'}));expect(restart).toHaveBeenCalledOnce();});

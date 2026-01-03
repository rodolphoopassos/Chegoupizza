
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface AuthScreenProps {
  onBypass: () => void;
}

export const AuthScreen = ({ onBypass }: AuthScreenProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Conta criada com sucesso!");
      }
    } catch (err: any) {
      setError(err.message || 'Erro na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 p-4 font-sans text-stone-900 dark:text-stone-100">
      <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800 p-10">
          <div className="text-center mb-10">
            <div className="inline-flex flex-col items-center mb-4">
              <div className="flex items-center gap-1 text-4xl font-black text-stone-900 dark:text-white uppercase tracking-tighter">
                CH
                <div className="flex flex-col w-3 h-8 gap-0.5 justify-center">
                  <div className="bg-[#008C45] h-1.5 w-full rounded-sm"></div>
                  <div className="bg-white h-1.5 w-full rounded-sm"></div>
                  <div className="bg-[#CD212A] h-1.5 w-full rounded-sm"></div>
                </div>
                GOU
              </div>
              <div className="text-[14px] font-light tracking-[0.5em] text-stone-500 uppercase -mt-1 ml-1">PIZZA</div>
            </div>
            <p className="text-stone-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Gestão Estratégica AI</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-stone-100 dark:bg-stone-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-red-600 dark:text-white" placeholder="E-mail" required />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-stone-100 dark:bg-stone-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-red-600 dark:text-white" placeholder="Senha" required />
            {error && <p className="text-red-500 text-xs font-bold text-center uppercase">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-red-700 transition-all active:scale-95">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : (isLogin ? 'ENTRAR NO PAINEL' : 'CRIAR CONTA')}
            </button>
          </form>
          <div className="mt-6 flex flex-col gap-2">
            <button onClick={() => setIsLogin(!isLogin)} className="text-[10px] font-black text-stone-400 hover:text-red-500 uppercase transition-colors tracking-[0.2em]">
              {isLogin ? "Não tem uma conta? Cadastre-se" : "Já tem conta? Faça Login"}
            </button>
            <button onClick={onBypass} className="text-[10px] font-black text-stone-400 hover:text-red-500 uppercase transition-colors tracking-[0.2em]">Acessar Modo Demonstração</button>
          </div>
      </div>
    </div>
  );
};

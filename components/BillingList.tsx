
import React from 'react';
import { BillingEntry, PurchasedProfile } from '../types';
import { 
  ShoppingBag, 
  Calendar, Car, Fingerprint, Tag, CreditCard, Hash
} from 'lucide-react';

interface BillingListProps {
  entries: BillingEntry[];
  profiles?: PurchasedProfile[];
  orderIds?: string[];
}

const ProfileCard: React.FC<{ profile: PurchasedProfile }> = ({ profile }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
    <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Car className="w-4 h-4 text-indigo-600" />
        <span className="text-xs font-black text-slate-700 uppercase tracking-tight">차량 프로파일</span>
      </div>
      <span className="text-[10px] font-mono font-bold text-slate-400">ID: {profile.id}</span>
    </div>
    
    <div className="p-5 space-y-4">
      <div>
        <h4 className="text-lg font-black text-slate-900 leading-tight mb-1">{profile.modelName}</h4>
        <div className="flex flex-wrap gap-2">
          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">{profile.year}년식</span>
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{profile.engine}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-slate-400 uppercase">Region</span>
          <span className="text-xs font-bold text-slate-700 truncate">{profile.region}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-slate-400 uppercase">Type</span>
          <span className={`text-xs font-bold ${profile.isMobdPlus ? 'text-purple-600' : 'text-emerald-600'}`}>
            {profile.isMobdPlus ? 'MOBD+' : 'Standard'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
        <Calendar className="w-3 h-3" />
        <span>업데이트: {profile.updateTime}</span>
      </div>
    </div>
  </div>
);

export const BillingList: React.FC<BillingListProps> = ({ profiles = [], orderIds = [] }) => {
  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. Subscription Summary Head */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-white/10 rounded-2xl">
            <CreditCard className="w-8 h-8 text-indigo-300" />
          </div>
          <div>
            <h2 className="text-2xl font-black">구매 및 구독 상태</h2>
            <p className="text-sm opacity-60 font-medium">인앱 결제 및 차량 프로파일 데이터를 분석합니다.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-center px-6 border-l border-white/10">
            <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-1">PROFILES</p>
            <p className="text-2xl font-black">{profiles.length}</p>
          </div>
          <div className="text-center px-6 border-l border-white/10">
            <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-1">ORDER IDS</p>
            <p className="text-2xl font-black">{orderIds.length}</p>
          </div>
        </div>
      </div>

      {/* 2. Purchased Profiles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" /> Purchased Profiles
          </h3>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
            User Profile Store
          </span>
        </div>
        
        {profiles.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-slate-300 text-slate-400 text-sm italic">
            구매된 차량 프로파일 정보가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((p, idx) => <ProfileCard key={`${p.id}-${idx}`} profile={p} />)}
          </div>
        )}
      </div>

      {/* 3. Transaction IDs */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
          <Hash className="w-4 h-4" /> Google Play Subscription IDs
        </h3>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm divide-y divide-slate-50 overflow-hidden">
          {orderIds.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm italic">
              감지된 Google Play 주문 번호가 없습니다.
            </div>
          ) : (
            orderIds.map((id, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Order Transaction ID</span>
                    <p className="text-sm font-mono font-black text-slate-700">{id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigator.clipboard.writeText(id)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded-lg text-[10px] font-bold transition-all text-slate-500"
                >
                  <Fingerprint className="w-3 h-3" /> 복사하기
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

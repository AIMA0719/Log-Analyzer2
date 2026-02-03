
import React from 'react';
import { BillingEntry, PurchasedProfile, StorageStatus } from '../types';
import { 
  CheckCircle, ShoppingBag, 
  Database, ShieldAlert,
  Calendar, Car, Fingerprint, Tag, CreditCard, Hash
} from 'lucide-react';

interface BillingListProps {
  entries: BillingEntry[];
  profiles?: PurchasedProfile[];
  orderIds?: string[];
  storage?: StorageStatus;
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

export const BillingList: React.FC<BillingListProps> = ({ profiles = [], orderIds = [], storage }) => {
  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. Storage & Subscription Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl"><Database className="w-6 h-6" /></div>
          <div>
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">여유 저장공간</p>
            <p className="text-xl font-black">{storage?.availableBytes || 'Unknown'}</p>
          </div>
        </div>

        <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl"><CreditCard className="w-6 h-6" /></div>
          <div>
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">구매 프로파일</p>
            <p className="text-xl font-black">{profiles.length}개 발견</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${storage?.exists ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
            {storage?.exists ? <CheckCircle className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Setting.xml 상태</p>
            <p className="text-xl font-black text-slate-800">{storage?.exists ? '정상 존재' : '파일 없음'}</p>
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
            Found in userPurchasedProfiles
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
          <Hash className="w-4 h-4" /> Detected Subscription / Order IDs
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
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Google Play Order ID</span>
                    <p className="text-sm font-mono font-black text-slate-700">{id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigator.clipboard.writeText(id)}
                  className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                >
                  <Fingerprint className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

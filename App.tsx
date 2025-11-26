import React, { useState, useEffect } from 'react';
import { Lead, LeadStatus, SERVICE_PRICES, PipelineResult } from './types';
import { processLeadWithGemini } from './services/geminiService';
import LeadCard from './components/LeadCard';

const SAMPLE_LEADS = [
  {
    name: "Rahul Kumar",
    msg: "Bhai kal birthday decoration chahiye Gaya me, budget 2000 hoga, kar paoge?"
  },
  {
    name: "Sneha G.",
    msg: "I need a home tutor for class 10 math in Kankarbagh area. Urgent requirement."
  },
  {
    name: "Amit S.",
    msg: "Hello, I am a photographer based in Patna. How can I list my services on LocalBookr?"
  },
  {
    name: "Priya D.",
    msg: "Mujhe apni beti ke liye ek mehendi artist chahiye, shaadi ke liye. Location Delhi, budget 10000. High urgency."
  },
  {
    name: "LocalBookr Team",
    msg: "What is LocalBookr about?"
  }
];

export default function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [inputName, setInputName] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);

  useEffect(() => {
    let keyExists = false;
    try {
      if (process.env.API_KEY) {
        keyExists = true;
      }
    } catch (e) {
      // Process is not defined, ignore
      console.warn("process.env not accessible");
    }
    setIsApiKeySet(keyExists);
  }, []);

  const handleAddLead = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputName || !inputMessage) return;

    const newLead: Lead = {
      id: Date.now().toString(),
      customerName: inputName,
      rawMessage: inputMessage,
      timestamp: Date.now(),
      isProcessing: true,
      status: LeadStatus.NEW, // Initial status
    };

    setLeads(prev => [newLead, ...prev]);
    setInputName('');
    setInputMessage('');

    try {
      const result: PipelineResult = await processLeadWithGemini(
        "pipeline",
        newLead.rawMessage,
        newLead.status,
        0, // time_since_last_reply_hours
        "" // previous_summary
      );
      
      setLeads(prev => prev.map(l => {
        if (l.id === newLead.id) {
          return { ...l, isProcessing: false, pipelineResult: result, status: result.new_status };
        }
        return l;
      }));
    } catch (error: any) {
      console.error(error);
      setLeads(prev => prev.map(l => {
        if (l.id === newLead.id) {
          return { ...l, isProcessing: false, error: error.message || "Unknown error occurred" };
        }
        return l;
      }));
    }
  };

  const loadSample = (index: number) => {
    setInputName(SAMPLE_LEADS[index].name);
    setInputMessage(SAMPLE_LEADS[index].msg);
  };

  const handleFollowUp = (leadId: string) => {
    // Placeholder for future follow-up logic
    // This would typically trigger processLeadWithGemini in "followup_only" mode
    // and update the lead's status and potentially its follow_up_message.
    console.log(`Triggering follow-up for lead: ${leadId}`);
    setLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, status: LeadStatus.FOLLOWED_UP } : l
    ));
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold">
                LB
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">LocalBookr <span className="text-indigo-600">Growth AI</span></h1>
            </div>
            <div className="flex items-center">
               <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                 {isApiKeySet ? 'System Online' : 'Check API Key'}
               </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Intro / Stats Header */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="bg-indigo-600 rounded-xl p-5 text-white shadow-lg shadow-indigo-200">
             <p className="text-indigo-200 text-sm font-medium mb-1">Active Leads</p>
             <p className="text-3xl font-bold">{leads.length}</p>
           </div>
           <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-center">
             <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">Pricing Tool DB</p>
             <div className="flex flex-wrap gap-1">
                {Object.keys(SERVICE_PRICES).slice(0, 4).map(k => (
                  <span key={k} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{k}</span>
                ))}
                <span className="text-xs text-gray-400 self-center">+ more</span>
             </div>
           </div>
           <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
             <p className="text-gray-500 text-sm font-medium mb-1">AI Pipeline</p>
             <ul className="text-xs space-y-1 text-gray-600">
               <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>Lead Understanding</li>
               <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>Tool Orchestration</li>
               <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>Reply Generation</li>
               <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>Follow-up Planning</li>
             </ul>
           </div>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Add New Customer Lead</h2>
          <form onSubmit={handleAddLead} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Lead Name</label>
              <input
                id="name"
                type="text"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="e.g. Rahul Kumar (Customer) or Amit Singh (Provider)"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Raw Message (Hinglish/English)
              </label>
              <textarea
                id="message"
                rows={3}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Paste the WhatsApp/SMS message here..."
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-2">
                 <button type="button" onClick={() => loadSample(0)} className="text-xs text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors">
                   Sample 1 (Customer Lead)
                 </button>
                 <button type="button" onClick={() => loadSample(2)} className="text-xs text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors">
                   Sample 2 (Provider Lead)
                 </button>
                 <button type="button" onClick={() => loadSample(4)} className="text-xs text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors">
                   Sample 3 (General Question)
                 </button>
              </div>
              <button
                type="submit"
                disabled={!inputName || !inputMessage || !isApiKeySet}
                className="bg-gray-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-black transition-all shadow-lg shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>Process Lead</span>
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </button>
            </div>
          </form>
        </div>

        {/* Results List */}
        <div className="space-y-6">
          <h2 className="text-gray-900 font-bold text-lg flex items-center gap-2">
             Recent Activity 
             <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{leads.length}</span>
          </h2>
          
          {leads.length === 0 && (
            <div className="text-center py-20 bg-white border border-dashed border-gray-300 rounded-xl">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
              <p className="text-gray-500 font-medium">No leads yet.</p>
              <p className="text-gray-400 text-sm mt-1">Add a message above to start the AI pipeline.</p>
            </div>
          )}

          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onFollowUp={handleFollowUp} />
          ))}
        </div>
      </main>
    </div>
  );
}
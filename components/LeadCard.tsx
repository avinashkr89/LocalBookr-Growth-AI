import React from 'react';
import { Lead, LeadStatus, Urgency } from '../types';

interface LeadCardProps {
  lead: Lead;
  onFollowUp: (leadId: string) => void; // Added for future follow-up action
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onFollowUp }) => {
  if (lead.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-red-800 font-semibold">Error Processing Lead</h3>
        <p className="text-red-600 mt-2">{lead.error}</p>
      </div>
    );
  }

  if (lead.isProcessing) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-100 rounded w-full"></div>
          <div className="h-4 bg-gray-100 rounded w-5/6"></div>
          <div className="h-4 bg-gray-100 rounded w-4/6"></div>
        </div>
      </div>
    );
  }

  const { pipelineResult, rawMessage, customerName } = lead;
  if (!pipelineResult) return null;

  const { parsed_lead, tools_result, reply_message, follow_up_message, new_status, summary } = pipelineResult;

  const getUrgencyColor = (urgency: Urgency | null) => {
    if (!urgency) return 'bg-gray-100 text-gray-700';

    switch (urgency.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleColor = (role: 'customer' | 'provider' | 'unknown') => {
    switch (role) {
      case 'customer': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'provider': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{customerName}</h3>
          <span className="text-xs text-indigo-600 font-mono">ID: {lead.id.slice(0, 8)}</span>
        </div>
        <div className="flex gap-2 items-center">
          {parsed_lead.role && (
             <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getRoleColor(parsed_lead.role)}`}>
               {parsed_lead.role}
             </span>
          )}
          {parsed_lead.intent_type && (
             <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-gray-200 bg-gray-100 text-gray-700">
               {parsed_lead.intent_type.replace('_', ' ')}
             </span>
          )}
          {tools_result.priority && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getUrgencyColor(tools_result.priority)}`}>
              {tools_result.priority} Priority
            </span>
          )}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Parsed Data & Raw */}
        <div className="space-y-6">
          
          {/* Raw Message */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Original Message</h4>
            <p className="text-gray-800 italic text-sm">"{rawMessage}"</p>
          </div>

          {/* Structured Extraction */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">AI Extracted Details</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white p-2 rounded border border-gray-100 shadow-sm">
                <span className="block text-gray-400 text-xs">Service</span>
                <span className="font-medium text-gray-800">{parsed_lead.service_type || "N/A"}</span>
              </div>
              <div className="bg-white p-2 rounded border border-gray-100 shadow-sm">
                <span className="block text-gray-400 text-xs">Budget</span>
                <span className="font-medium text-gray-800">
                  {parsed_lead.budget !== null && parsed_lead.budget > 0 ? `₹${parsed_lead.budget}` : 'Not Specified'}
                </span>
              </div>
              <div className="bg-white p-2 rounded border border-gray-100 shadow-sm">
                <span className="block text-gray-400 text-xs">Date</span>
                <span className="font-medium text-gray-800">{parsed_lead.date || "Not Specified"}</span>
              </div>
              <div className="bg-white p-2 rounded border border-gray-100 shadow-sm">
                <span className="block text-gray-400 text-xs">Location</span>
                <span className="font-medium text-gray-800">{parsed_lead.location || "Unknown"}</span>
              </div>
            </div>
            {parsed_lead.notes && (
                <div className="mt-3 bg-white p-2 rounded border border-gray-100 shadow-sm">
                  <span className="block text-gray-400 text-xs">Notes</span>
                  <span className="font-medium text-gray-800 text-sm">{parsed_lead.notes}</span>
                </div>
            )}
          </div>

          {/* Tool Results */}
          <div className="mt-6">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">AI Tool Insights</h4>
            <div className="grid grid-cols-1 gap-3 text-sm">
                {tools_result.base_price_inr !== null && tools_result.base_price_inr > 0 && (
                    <div className="bg-white p-2 rounded border border-gray-100 shadow-sm">
                        <span className="block text-gray-400 text-xs">Base Price</span>
                        <span className="font-medium text-gray-800">₹{tools_result.base_price_inr} (starting)</span>
                    </div>
                )}
                {tools_result.provider_summary && (
                    <div className="bg-white p-2 rounded border border-gray-100 shadow-sm">
                        <span className="block text-gray-400 text-xs">Provider Status</span>
                        <span className="font-medium text-gray-800">{tools_result.provider_summary}</span>
                    </div>
                )}
                <div className="bg-white p-2 rounded border border-gray-100 shadow-sm">
                  <span className="block text-gray-400 text-xs">Lead Summary</span>
                  <span className="font-medium text-gray-800">{summary || "N/A"}</span>
                </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Action */}
        <div className="space-y-6">
          {/* Generated Reply */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <h4 className="text-xs font-semibold text-indigo-600 uppercase">Draft Reply (Ready to Send)</h4>
              <button className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition-colors">
                Copy
              </button>
            </div>
            <div className="bg-white border-2 border-indigo-100 rounded-xl rounded-tl-none p-4 shadow-sm relative">
                <p className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">
                  {reply_message}
                </p>
            </div>
          </div>

          {/* Follow Up Strategy */}
          {follow_up_message && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Suggested Follow-Up (Later)</h4>
              <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-sm text-gray-700">
                <p className="italic">{follow_up_message}</p>
              </div>
              <button 
                onClick={() => onFollowUp(lead.id)} 
                className="mt-2 text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors"
                disabled={lead.status === LeadStatus.FOLLOWED_UP || lead.status === LeadStatus.CLOSED}
                >
                Mark Followed Up
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 flex gap-3">
             <button className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 shadow-sm text-sm transition-all active:scale-95">
                Send Reply via WhatsApp
             </button>
             <button className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 shadow-sm text-sm transition-all active:scale-95">
                Archive / Close
             </button>
          </div>
          <div className="text-right text-xs text-gray-500 mt-2">
            Current Status: <span className="font-semibold text-indigo-700">{new_status}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadCard;
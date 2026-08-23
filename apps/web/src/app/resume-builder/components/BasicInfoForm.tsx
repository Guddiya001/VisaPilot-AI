'use client';

import { useResume } from '../context';
import { User, Globe, FileText, Mail, Phone, MapPin, Linkedin, Github, Link } from 'lucide-react';

export default function BasicInfoForm() {
  const { data, dispatch } = useResume();
  const { basics } = data;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    dispatch({ type: 'SET_BASICS', payload: { [name]: value } });
  };

  const inputBase =
    'w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all hover:border-gray-300';

  const textareaBase =
    'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all hover:border-gray-300 resize-none';

  const Field = ({
    label,
    name,
    placeholder,
    icon: Icon,
    type = 'text',
  }: {
    label: string;
    name: string;
    placeholder: string;
    icon: React.ElementType;
    type?: string;
  }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          name={name}
          type={type}
          value={(basics as unknown as Record<string, string>)[name] ?? ''}
          onChange={handleChange}
          className={inputBase}
          placeholder={placeholder}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Personal Details */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="p-1.5 bg-primary-100 rounded-md">
            <User className="w-3.5 h-3.5 text-primary-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-700">Personal Details</h3>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full Name" name="name" placeholder="John Doe" icon={User} />
          <Field label="Professional Title" name="title" placeholder="Senior Software Engineer" icon={FileText} />
          <Field label="Email" name="email" type="email" placeholder="john@example.com" icon={Mail} />
          <Field label="Phone" name="phone" placeholder="+1 234 567 890" icon={Phone} />
          <div className="md:col-span-2">
            <Field label="Location" name="location" placeholder="New York, NY (Open to Relocation)" icon={MapPin} />
          </div>
          <div className="md:col-span-2">
            <Field label="Open To (Optional)" name="openTo" placeholder="Remote, Relocation, Visa Sponsorship..." icon={Globe} />
          </div>
        </div>
      </div>

      {/* Online Presence */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="p-1.5 bg-blue-100 rounded-md">
            <Globe className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-700">Online Presence</h3>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="LinkedIn" name="linkedin" placeholder="linkedin.com/in/johndoe" icon={Linkedin} />
          <Field label="GitHub" name="github" placeholder="github.com/johndoe" icon={Github} />
          <div className="md:col-span-2">
            <Field label="Portfolio / Website" name="portfolio" placeholder="johndoe.dev" icon={Link} />
          </div>
        </div>
      </div>

      {/* Professional Summary */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="p-1.5 bg-emerald-100 rounded-md">
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-700">Professional Summary</h3>
          <span className="ml-auto text-xs text-gray-400">{basics.summary.length}/500 chars</span>
        </div>
        <div className="p-5">
          <textarea
            name="summary"
            value={basics.summary}
            onChange={handleChange}
            className={`${textareaBase} h-36`}
            placeholder="Staff-level Engineer with X+ years of experience in... Proven track record of..."
            maxLength={500}
          />
          <p className="mt-2 text-xs text-gray-400">
            💡 Tip: Include your years of experience, top 3 skills, and what makes you unique. Keep it 3–4 sentences.
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useResume } from '../context';

export default function BasicInfoForm() {
  const { data, dispatch } = useResume();
  const { basics } = data;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    dispatch({ type: 'SET_BASICS', payload: { [name]: value } });
  };

  const inputClass = "w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1 mt-4";

  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm">
      <h2 className="text-xl font-semibold mb-6 text-gray-800">Basic Information</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <div>
          <label className={labelClass}>Full Name</label>
          <input name="name" value={basics.name} onChange={handleChange} className={inputClass} placeholder="John Doe" />
        </div>
        <div>
          <label className={labelClass}>Professional Title</label>
          <input name="title" value={basics.title} onChange={handleChange} className={inputClass} placeholder="Senior Software Engineer" />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input name="email" value={basics.email} onChange={handleChange} className={inputClass} placeholder="john@example.com" />
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input name="phone" value={basics.phone} onChange={handleChange} className={inputClass} placeholder="+1 234 567 890" />
        </div>
        <div>
          <label className={labelClass}>Location</label>
          <input name="location" value={basics.location} onChange={handleChange} className={inputClass} placeholder="New York, NY" />
        </div>
        <div>
          <label className={labelClass}>LinkedIn</label>
          <input name="linkedin" value={basics.linkedin} onChange={handleChange} className={inputClass} placeholder="linkedin.com/in/johndoe" />
        </div>
        <div>
          <label className={labelClass}>GitHub</label>
          <input name="github" value={basics.github} onChange={handleChange} className={inputClass} placeholder="github.com/johndoe" />
        </div>
        <div>
          <label className={labelClass}>Portfolio</label>
          <input name="portfolio" value={basics.portfolio} onChange={handleChange} className={inputClass} placeholder="johndoe.com" />
        </div>
      </div>
      
      <div>
        <label className={labelClass}>Open To (Optional)</label>
        <input name="openTo" value={basics.openTo || ''} onChange={handleChange} className={inputClass} placeholder="Relocation, Remote, etc." />
      </div>

      <div>
        <label className={labelClass}>Professional Summary</label>
        <textarea name="summary" value={basics.summary} onChange={handleChange} className={`${inputClass} h-32 resize-none`} placeholder="Briefly describe your background and key strengths..." />
      </div>
    </div>
  );
}

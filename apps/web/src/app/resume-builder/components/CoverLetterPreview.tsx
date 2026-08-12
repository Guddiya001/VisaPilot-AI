'use client';

import React from 'react';
import { useResume } from '../context';
import '../resume-preview.css';

export function CoverLetterPreview() {
  const { data } = useResume();

  return (
    <div className="bg-white shadow-xl mx-auto overflow-y-auto" style={{ width: '100%', maxWidth: '210mm', aspectRatio: '1 / 1.414' }}>
      <div className="resume-preview">
        <main className="rp-page" itemScope itemType="https://schema.org/Person">
          <header className="rp-header">
            <h1 className="rp-name" itemProp="name">{data.basics.name}</h1>
            <p className="rp-subtitle" itemProp="jobTitle">{data.basics.title}</p>
            <div className="rp-contacts">
              {data.basics.location && <span>{data.basics.location}</span>}
              {data.basics.phone && <span className="rp-sep">|</span>}
              {data.basics.phone && <span>{data.basics.phone}</span>}
              {data.basics.email && <span className="rp-sep">|</span>}
              {data.basics.email && <span>{data.basics.email}</span>}
            </div>
            {(data.basics.linkedin || data.basics.github || data.basics.portfolio) && (
              <div className="rp-links">
                {data.basics.linkedin && <span>{data.basics.linkedin.replace(/^https?:\/\//, '')}</span>}
                {data.basics.github && <span className="rp-sep">|</span>}
                {data.basics.github && <span>{data.basics.github.replace(/^https?:\/\//, '')}</span>}
                {data.basics.portfolio && <span className="rp-sep">|</span>}
                {data.basics.portfolio && <span>{data.basics.portfolio.replace(/^https?:\/\//, '')}</span>}
              </div>
            )}
          </header>

          <section className="rp-section rp-cover-letter-content" style={{ marginTop: '2rem' }}>
            {data.coverLetter.paragraphs.map((p, idx) => (
              <p key={idx} style={{ marginBottom: '1rem', lineHeight: '1.6' }}>{p}</p>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}

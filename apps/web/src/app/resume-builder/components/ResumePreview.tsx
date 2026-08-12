'use client';

import React from 'react';
import { useResume } from '../context';
import { ResumeData } from '../types';
import '../resume-preview.css';

export function ResumePreview() {
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
            {data.basics.openTo && (
              <p className="rp-open-to">Open to: {data.basics.openTo}</p>
            )}
          </header>

          {data.basics.summary && (
            <section className="rp-section">
              <h2 className="rp-section-title">Professional Summary</h2>
              <p>{data.basics.summary}</p>
            </section>
          )}

          {data.experience.length > 0 && (
            <section className="rp-section">
              <h2 className="rp-section-title">Work Experience</h2>
              {data.experience.map((exp) => (
                <article key={exp.id} className="rp-role">
                  <header className="rp-role-head">
                    <h3 className="rp-role-heading">
                      <span className="rp-role-title">{exp.role}</span>
                      {exp.company && <span className="rp-dash">|</span>}
                      <span className="rp-company">{exp.company} {exp.client ? `(${exp.client})` : ''}</span>
                    </h3>
                    <div className="rp-role-meta">
                      {exp.location && <span>{exp.location}</span>}
                      {exp.location && exp.period && <span className="rp-sep">|</span>}
                      {exp.period && <span>{exp.period}</span>}
                    </div>
                  </header>
                  {exp.bullets.length > 0 && (
                    <ul className="rp-bullets">
                      {exp.bullets.map((bullet, idx) => (
                        <li key={idx}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </section>
          )}

          {data.skillsFlat.length > 0 && (
            <section className="rp-section">
              <h2 className="rp-section-title">CORE SKILLS</h2>
              {data.skillsFlat.map((skillLine, idx) => (
                <p key={idx} className="rp-skills-flat-line">{skillLine}</p>
              ))}
            </section>
          )}

          {data.projects.length > 0 && (
            <section className="rp-section rp-projects-section">
              <h2 className="rp-section-title">Selected Projects</h2>
              {data.projects.map((proj) => (
                <article key={proj.id} className="rp-role">
                  <header className="rp-role-head">
                    <h3 className="rp-role-heading">
                      <span className="rp-role-title">{proj.name}</span>
                    </h3>
                  </header>
                  <p>
                    {proj.description}
                    {proj.technologies && <span className="rp-project-tech"> Technologies: {proj.technologies}</span>}
                  </p>
                </article>
              ))}
            </section>
          )}

          {data.education.length > 0 && (
            <section className="rp-section rp-education-section">
              <h2 className="rp-section-title">EDUCATION</h2>
              {data.education.map((edu) => (
                <article key={edu.id} className="rp-role">
                  <header className="rp-role-head">
                    <h3 className="rp-role-heading">
                      <span className="rp-role-title">{edu.degree}</span> <span className="rp-dash">|</span> <span className="rp-company">{edu.school}</span>
                    </h3>
                    <div className="rp-role-meta">
                      {edu.location && <span>{edu.location}</span>}
                      {edu.location && edu.year && <span className="rp-sep">|</span>}
                      {edu.year && <span>{edu.year}</span>}
                    </div>
                  </header>
                </article>
              ))}
            </section>
          )}

          {data.certificates.length > 0 && (
            <section className="rp-section rp-certificates-section">
              <h2 className="rp-section-title">CERTIFICATIONS</h2>
              <ul className="rp-bullets">
                {data.certificates.map((cert, idx) => (
                  <li key={idx}>{cert}</li>
                ))}
              </ul>
            </section>
          )}

          {data.achievements.length > 0 && (
            <section className="rp-section">
              <h2 className="rp-section-title">ACHIEVEMENTS</h2>
              <ul className="rp-bullets">
                {data.achievements.map((ach, idx) => (
                  <li key={idx}>{ach}</li>
                ))}
              </ul>
            </section>
          )}

          {data.languages.length > 0 && (
            <section className="rp-section">
              <h2 className="rp-section-title">Languages</h2>
              <ul className="rp-bullets">
                {data.languages.map((lang, idx) => (
                  <li key={idx}>{lang}</li>
                ))}
              </ul>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export function generatePrintHTML(data: ResumeData): string {
  const parts: string[] = [];

  // Header
  parts.push('<header class="rp-header">');
  parts.push('<h1 itemprop="name">' + esc(data.basics.name) + '</h1>');
  parts.push('<p class="rp-subtitle" itemprop="jobTitle">' + esc(data.basics.title) + '</p>');
  parts.push('<div class="rp-contacts">');
  if (data.basics.location) parts.push('<span>' + esc(data.basics.location) + '</span>');
  if (data.basics.location && data.basics.phone) parts.push('<span class="rp-sep">|</span>');
  if (data.basics.phone) parts.push('<span>' + esc(data.basics.phone) + '</span>');
  if (data.basics.phone && data.basics.email) parts.push('<span class="rp-sep">|</span>');
  if (data.basics.email) parts.push('<span>' + esc(data.basics.email) + '</span>');
  parts.push('</div>');
  if (data.basics.linkedin || data.basics.github || data.basics.portfolio) {
    parts.push('<div class="rp-links">');
    if (data.basics.linkedin) parts.push('<span>' + esc(data.basics.linkedin.replace(/^https?:\/\//, '')) + '</span>');
    if (data.basics.linkedin && data.basics.github) parts.push('<span class="rp-sep">|</span>');
    if (data.basics.github) parts.push('<span>' + esc(data.basics.github.replace(/^https?:\/\//, '')) + '</span>');
    if ((data.basics.linkedin || data.basics.github) && data.basics.portfolio) parts.push('<span class="rp-sep">|</span>');
    if (data.basics.portfolio) parts.push('<span>' + esc(data.basics.portfolio.replace(/^https?:\/\//, '')) + '</span>');
    parts.push('</div>');
  }
  if (data.basics.openTo) parts.push('<p class="rp-open-to">Open to: ' + esc(data.basics.openTo) + '</p>');
  parts.push('</header>');

  // Summary
  if (data.basics.summary) {
    parts.push('<section class="rp-section">');
    parts.push('<h2>Professional Summary</h2>');
    parts.push('<p>' + esc(data.basics.summary) + '</p>');
    parts.push('</section>');
  }

  // Experience
  if (data.experience.length > 0) {
    parts.push('<section class="rp-section">');
    parts.push('<h2>Work Experience</h2>');
    for (const exp of data.experience) {
      parts.push('<article class="rp-role">');
      parts.push('<header class="rp-role-head">');
      parts.push('<h3 class="rp-role-heading">');
      parts.push('<span class="rp-role-title">' + esc(exp.role) + '</span>');
      if (exp.company) parts.push(' <span class="rp-dash">|</span> ');
      parts.push('<span class="rp-company">' + esc(exp.company) + (exp.client ? ' (' + esc(exp.client) + ')' : '') + '</span>');
      parts.push('</h3>');
      parts.push('<div class="rp-role-meta">');
      if (exp.location) parts.push('<span>' + esc(exp.location) + '</span>');
      if (exp.location && exp.period) parts.push('<span class="rp-sep">|</span>');
      if (exp.period) parts.push('<span>' + esc(exp.period) + '</span>');
      parts.push('</div>');
      parts.push('</header>');
      if (exp.bullets.length > 0) {
        parts.push('<ul class="rp-bullets">');
        for (const bullet of exp.bullets) {
          parts.push('<li>' + esc(bullet) + '</li>');
        }
        parts.push('</ul>');
      }
      parts.push('</article>');
    }
    parts.push('</section>');
  }

  // Skills
  if (data.skillsFlat.length > 0) {
    parts.push('<section class="rp-section">');
    parts.push('<h2>CORE SKILLS</h2>');
    for (const skill of data.skillsFlat) {
      parts.push('<p class="rp-skills-flat-line">' + esc(skill) + '</p>');
    }
    parts.push('</section>');
  }

  // Projects
  if (data.projects.length > 0) {
    parts.push('<section class="rp-section rp-projects-section">');
    parts.push('<h2>Selected Projects</h2>');
    for (const proj of data.projects) {
      parts.push('<article class="rp-role">');
      parts.push('<header class="rp-role-head"><h3 class="rp-role-heading"><span class="rp-role-title">' + esc(proj.name) + '</span></h3></header>');
      parts.push('<p>' + esc(proj.description));
      if (proj.technologies) parts.push(' <span class="rp-project-tech">Technologies: ' + esc(proj.technologies) + '</span>');
      parts.push('</p></article>');
    }
    parts.push('</section>');
  }

  // Education
  if (data.education.length > 0) {
    parts.push('<section class="rp-section rp-education-section">');
    parts.push('<h2>EDUCATION</h2>');
    for (const edu of data.education) {
      parts.push('<article class="rp-role"><header class="rp-role-head">');
      parts.push('<h3 class="rp-role-heading"><span class="rp-role-title">' + esc(edu.degree) + '</span> <span class="rp-dash">|</span> <span class="rp-company">' + esc(edu.school) + '</span></h3>');
      parts.push('<div class="rp-role-meta">');
      if (edu.location) parts.push('<span>' + esc(edu.location) + '</span>');
      if (edu.location && edu.year) parts.push('<span class="rp-sep">|</span>');
      if (edu.year) parts.push('<span>' + esc(edu.year) + '</span>');
      parts.push('</div></header></article>');
    }
    parts.push('</section>');
  }

  // Certificates
  if (data.certificates.length > 0) {
    parts.push('<section class="rp-section rp-certificates-section">');
    parts.push('<h2>CERTIFICATIONS</h2>');
    parts.push('<ul class="rp-bullets">');
    for (const cert of data.certificates) {
      parts.push('<li>' + esc(cert) + '</li>');
    }
    parts.push('</ul></section>');
  }

  // Achievements
  if (data.achievements.length > 0) {
    parts.push('<section class="rp-section">');
    parts.push('<h2>ACHIEVEMENTS</h2>');
    parts.push('<ul class="rp-bullets">');
    for (const ach of data.achievements) {
      parts.push('<li>' + esc(ach) + '</li>');
    }
    parts.push('</ul></section>');
  }

  // Languages
  if (data.languages.length > 0) {
    parts.push('<section class="rp-section">');
    parts.push('<h2>Languages</h2>');
    parts.push('<ul class="rp-bullets">');
    for (const lang of data.languages) {
      parts.push('<li>' + esc(lang) + '</li>');
    }
    parts.push('</ul></section>');
  }

  return '<div class="resume-print-window"><main class="rp-page" itemscope itemtype="https://schema.org/Person">'
    + parts.join('\n')
    + '</main></div>';
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

import { searchAgent } from './packages/ai/src/agents/search';
import { coordinatorAgent } from './packages/ai/src/agents/coordinator';
import { AgentContext } from './packages/ai/src/types';

async function main() {
  const query = "Search for newly posted senior software engineering jobs worldwide that support visa sponsorship, relocation assistance, international hiring, work permit support, or remote global hiring for a Senior Full-Stack Engineer based in India with experience in React.js, Next.js, TypeScript, JavaScript, Node.js, Vue.js, Python, GenAI, AWS, Docker, Kubernetes, Kafka, Tailwind CSS, distributed systems, and microservices. Prioritize Germany, Netherlands, Sweden, Denmark, Norway, Estonia, Poland, Ireland, UAE, Singapore, Australia, New Zealand, UK, Canada, and remote worldwide roles. Include only new jobs posted within the last 30 days (preferably last 7 days), direct apply links, sponsorship or relocation evidence, confidence score, ATS match score, and mark the highest-priority roles as APPLY TODAY. Avoid repeating previously reported jobs unless there is a significant update.";
  
  const context = {
    searchQuery: query,
    searchFilters: {
      visaSponsorship: 'SPONSORS',
      remote: true
    },
    userSkills: ['React.js', 'Next.js', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker', 'Kubernetes']
  };

  console.log("Routing query...");
  // Try coordinating first if needed, but let's just go straight to search Agent to see its output
  console.log("Running search agent...");
  const result = await searchAgent.process(context as any);
  
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);

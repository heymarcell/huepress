import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <>
      <SEO title="Privacy Policy - HuePress" description="Privacy Policy for HuePress" />
      <div className="bg-gray-50 min-h-screen py-12 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
            
            <div className="mb-10 text-center">
              <h1 className="font-serif text-3xl md:text-4xl text-ink mb-4">Privacy Policy</h1>
              <p className="text-gray-500 font-medium">Last Updated: December 23, 2025</p>
            </div>

            <div className="space-y-6 text-gray-600 leading-relaxed">
              
              <section>
                <h2 className="font-serif text-2xl text-ink mb-4">Summary of Key Points</h2>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Who We Are:</strong> HuePress is operated by <strong>lamaland.us LLC</strong>, based in San Francisco, USA.</li>
                  <li><strong>Data We Collect:</strong> Account details (via Clerk), usage logs, payment records (via Stripe), and device identifiers.</li>
                  <li><strong>Purpose:</strong> To provide our SaaS platform, process subscriptions, offer support, and improve our services via analytics.</li>
                  <li><strong>Cookies & Tracking:</strong> We use essential cookies for security. For EU/EEA users, we require <strong>consent</strong> before loading non-essential trackers (like Google Analytics 4 or ad pixels).</li>
                  <li><strong>International Transfers:</strong> We are a US-based company. Your data is processed in the United States using standard safeguards.</li>
                  <li><strong>Your Rights:</strong> You can request access, correction, or deletion of your data at any time by emailing us.</li>
                  <li><strong>Deletion:</strong> You can delete your account via your settings page or by contacting support.</li>
                </ul>
              </section>

              <hr className="border-gray-100 my-8" />

              <section>
                <h2 className="font-serif text-xl text-ink mb-3">1. Who We Are (Controller)</h2>
                <p className="mb-4">HuePress ("we," "our," or "us") provides digital creative tools and resources via our website. For the purposes of the General Data Protection Regulation (GDPR) and other applicable laws, the <strong>Data Controller</strong> is:</p>
                <ul className="list-none bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-1 mb-4">
                  <li><strong>Legal Entity:</strong> lamaland.us LLC (DBA HuePress)</li>
                  <li><strong>Address:</strong> 357, 28 Geary St STE 650, San Francisco, CA 94108, USA</li>
                  <li><strong>Email:</strong> privacy@huepress.co</li>
                </ul>
              </section>

              <section>
                <h2 className="font-serif text-xl text-ink mb-3">2. Scope</h2>
                <p>This Privacy Policy applies to your use of our website (<strong>https://huepress.co/</strong>), our web application, and any related services (collectively, the "Services").</p>
              </section>

              <section>
                <h2 className="font-serif text-xl text-ink mb-3">3. Personal Data We Collect</h2>
                <p className="mb-2">We collect the following categories of personal data:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Account Information:</strong> Name, email address, password (processed securely via our auth provider), and profile preferences.</li>
                  <li><strong>Subscription & Transaction Data:</strong> Purchase history, invoices, plan status, and limited payment details (last 4 digits/brand). <strong>Note:</strong> We do not store full credit card numbers; payments are processed by Stripe.</li>
                  <li><strong>Usage Data:</strong> IP address, browser type, device info, operating system, and interaction logs (pages visited, timestamps).</li>
                  <li><strong>Communication Data:</strong> Emails sent to customer support and feedback.</li>
                  <li><strong>Cookies & Identifiers:</strong> Unique online identifiers, cookie IDs, and similar tracking technologies.</li>
                </ul>
              </section>

              <section>
                <h2 className="font-serif text-xl text-ink mb-3">4. How We Use Personal Data</h2>
                <p className="mb-2">We use your data for the following purposes:</p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li><strong>Providing the Service:</strong> To authenticate you, manage your account, and deliver digital downloads.</li>
                  <li><strong>Billing & Administration:</strong> To process payments and manage subscriptions.</li>
                  <li><strong>Support:</strong> To respond to your inquiries and troubleshoot issues.</li>
                  <li><strong>Security & Fraud Prevention:</strong> To detect unauthorized access and protect our platform.</li>
                  <li><strong>Analytics & Improvement:</strong> To understand how users interact with our app (via Google Analytics 4) so we can improve features.</li>
                  <li><strong>Marketing & Advertising:</strong> To send newsletters (if opted in) and, where enabled, to show relevant ads on third-party platforms.</li>
                  <li><strong>Legal Compliance:</strong> To satisfy tax, accounting, and legal obligations.</li>
                </ol>
              </section>

              <section>
                <h2 className="font-serif text-xl text-ink mb-3">5. Legal Bases (EU/EEA)</h2>
                <p className="mb-2">For users in the European Economic Area (EEA), we rely on the following legal bases under GDPR:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Contract:</strong> To provide the Service, manage accounts, and process payments.</li>
                  <li><strong>Legitimate Interests:</strong> For security monitoring, fraud prevention, and product improvement analytics (where consent is not required).</li>
                  <li><strong>Consent:</strong> For sending marketing emails and placing non-essential cookies/pixels (e.g., ads, detailed analytics). You may withdraw consent at any time.</li>
                  <li><strong>Legal Obligation:</strong> For maintaining tax and accounting records.</li>
                </ul>
              </section>

              <section>
                <h2 className="font-serif text-xl text-ink mb-3">6. Cookies, Tracking, and Advertising</h2>
                <p className="mb-2">We use cookies to make our site work.</p>
                <ul className="list-disc pl-5 space-y-2 mb-4">
                  <li><strong>Essential Cookies:</strong> Necessary for login, security, and payments. These cannot be disabled.</li>
                  <li><strong>Analytics & Marketing Cookies:</strong> Used to track performance and ad relevance (e.g., Google Analytics 4, Pinterest, Meta).</li>
                </ul>
                <p><strong>EU/EEA Users:</strong> We use a custom consent management tool to block non-essential identifiers until you click "Accept." You can manage your preferences at any time via the <Link to="#choices" className="text-primary hover:underline">Cookie Preferences</Link> link in the footer.</p>
              </section>

              <section>
                <h2 className="font-serif text-xl text-ink mb-3">7. How We Share Personal Data</h2>
                <p className="mb-2">We do not sell your personal data to data brokers. We share data only with:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Service Providers:</strong> Third-party vendors who help us operate.
                    <ul className="list-circle pl-5 mt-2 space-y-1 text-sm">
                      <li><strong>Hosting/Security:</strong> Cloudflare</li>
                      <li><strong>Authentication:</strong> Clerk</li>
                      <li><strong>Payments:</strong> Stripe</li>
                      <li><strong>Analytics:</strong> Google (GA4)</li>
                      <li><strong>Advertising:</strong> Pinterest, Meta, Google Ads (when enabled)</li>
                      <li><strong>Email Services:</strong> MailerLite</li>
                      <li><strong>Consent Management:</strong> Internal custom implementation</li>
                    </ul>
                  </li>
                  <li><strong>Legal Authorities:</strong> If required by law, court order, or to protect rights/safety.</li>
                  <li><strong>Business Transfers:</strong> If HuePress is acquired or merged, user data may be transferred as an asset.</li>
                </ul>
              </section>

              <section>
                <h2 className="font-serif text-xl text-ink mb-3">8. International Data Transfers</h2>
                <p className="mb-4">HuePress is located in the <strong>United States</strong>. Information we collect is processed in the US.</p>
                <p>If you are located in the EU/EEA, be aware that US privacy laws may differ from yours. We protect transfers using recognized safeguards, such as Standard Contractual Clauses (SCCs) entered into with our vendors and service providers.</p>
              </section>

              <section>
                <h2 className="font-serif text-xl text-ink mb-3">9. Data Retention</h2>
                <p className="mb-2">We retain personal data only as long as necessary:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Account Data:</strong> While your account is active, plus 30 days after deletion to ensure completion.</li>
                  <li><strong>Billing Records:</strong> 7 years (for tax/regulatory compliance).</li>
                  <li><strong>Logs/Technical Data:</strong> 30–90 days; security logs up to 12 months.</li>
                  <li><strong>Analytics:</strong> 14 months (or default provider setting).</li>
                  <li><strong>Marketing List:</strong> Until you unsubscribe, plus up to 24 months of inactivity before cleanup.</li>
                </ul>
              </section>

              <section>
                <h2 className="font-serif text-xl text-ink mb-3">10. Security</h2>
                <p>We implement reasonable technical and organizational measures (such as encryption and access controls) to protect your data. However, no internet transmission is 100% secure, and we cannot guarantee absolute security.</p>
              </section>

              <section>
                <h2 className="font-serif text-xl text-ink mb-3">11. Your Choices and Rights (All Users)</h2>
                <p className="mb-2">You have the right to:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Opt-out of Marketing:</strong> Click "Unsubscribe" in any email.</li>
                  <li><strong>Access or Correct:</strong> Update details in your account settings.</li>
                  <li><strong>Delete Account:</strong> Use the self-serve deletion option in settings or email us.</li>
                  <li><strong>Disable Cookies:</strong> Use your browser settings or our onsite consent manager.</li>
                </ul>
              </section>

              <section>
                <h2 className="font-serif text-xl text-ink mb-3">12. EU/EEA Notice (GDPR)</h2>
                <p className="mb-2">If you are in the EU/EEA, you have specific rights:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Right to Access:</strong> Request a copy of your data.</li>
                  <li><strong>Right to Rectification:</strong> Correct inaccurate data.</li>
                  <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> Request deletion of data (subject to legal retention needs).</li>
                  <li><strong>Right to Restriction/Objection:</strong> Limit processing or object to processing based on legitimate interests.</li>
                  <li><strong>Data Portability:</strong> Receive your data in a structured format.</li>
                  <li><strong>Withdraw Consent:</strong> At any time (affects future processing only).</li>
                </ul>
                <p className="mt-4">To exercise these rights, email <strong>privacy@huepress.co</strong>. You also have the right to lodge a complaint with your local Data Protection Authority (DPA).</p>
              </section>

              <section id="choices">
                <h2 className="font-serif text-xl text-ink mb-3">13. US Notice</h2>
                
                <h3 className="font-bold text-ink mb-2">13A. California Notice</h3>
                <p className="italic text-sm mb-2">Applicable if you are a California resident.</p>
                <ul className="list-disc pl-5 space-y-2 mb-4">
                  <li><strong>Categories Collected:</strong> Identifiers (name, email, IP), Customer Records (billing), Internet Activity (logs, interactions), Commercial Info (purchase history).</li>
                  <li><strong>Your Rights (CCPA/CPRA):</strong> Right to know, right to delete, right to correct, right to non-discrimination.</li>
                  <li><strong>"Do Not Sell or Share":</strong> We do not "sell" data for money. However, using ad pixels (Pinterest, Meta, Google) may constitute "sharing" for cross-context behavioral advertising under California law.</li>
                </ul>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                   <h4 className="font-bold text-ink mb-2">Your Privacy Choices</h4>
                   <p className="text-sm text-gray-600 mb-0">
                     You may opt out of this "sharing" by clicking the <strong>"Your Privacy Choices"</strong> or <strong>"Do Not Sell or Share My Personal Information"</strong> link in our footer, or by enabling the <strong>Global Privacy Control (GPC)</strong> signal in your browser. We honor valid GPC signals.
                   </p>
                </div>

                <h3 className="font-bold text-ink mb-2">13B. Other State Rights</h3>
                <p>Residents of Virginia, Colorado, Connecticut, and Utah may have similar rights to access, delete, and port data, and to opt-out of targeted advertising. Contact us to exercise these rights.</p>
              </section>

              <section>
                <h2 className="font-serif text-xl text-ink mb-3">14. Children’s Privacy</h2>
                <p>Our Service is not directed to children under 13. We do not knowingly collect personal data from children under 13. If we discover such data, we will delete it immediately.</p>
              </section>

              <section>
                <h2 className="font-serif text-xl text-ink mb-3">15. Contact Us</h2>
                <p className="mb-2">For privacy questions, concerns, or to exercise your rights:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Email:</strong> privacy@huepress.co</li>
                  <li><strong>Mail:</strong> HuePress (lamaland.us LLC), 357, 28 Geary St STE 650, San Francisco, CA 94108, USA</li>
                </ul>
              </section>

              <section>
                <h2 className="font-serif text-xl text-ink mb-3">16. Changes to This Policy</h2>
                <p>We may update this policy periodically. Changes will be posted on this page with an updated "Last Updated" date. Continued use of the Service signifies acceptance of the changes.</p>
              </section>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

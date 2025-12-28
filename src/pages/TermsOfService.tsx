import { SEO } from "@/components/SEO";


export default function TermsOfService() {
  return (
    <>
      <SEO title="Terms of Service - HuePress" description="Terms of Service for HuePress" />
      <div className="bg-gray-50 min-h-screen py-12 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
            
            <div className="mb-10 text-center">
              <h1 className="font-serif text-3xl md:text-4xl text-ink mb-4">Terms of Service</h1>
              <p className="text-gray-500 font-medium">Last Updated: December 28, 2025</p>
            </div>

            <div className="space-y-6 text-gray-600 leading-relaxed">
              
              {/* Introduction */}
              <section>
                <h2 className="font-serif text-2xl text-ink mb-4">1. Acceptance of Terms</h2>
                <p className="mb-4">
                  These Terms of Service ("Terms") constitute a binding legal agreement between you ("you," "user," or "member") and <strong>lamaland.us LLC</strong>, doing business as <strong>HuePress</strong> ("Company," "we," "our," or "us").
                </p>
                <p className="mb-4">
                  By accessing or using our website located at <strong>https://huepress.co/</strong> (the "Site") or our services, including our web application and digital library (collectively, the "Services"), you agree to be bound by these Terms. If you do not agree to these Terms, you must not access or use the Services.
                </p>
                
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-md">
                  <p className="font-bold text-amber-800 mb-1">IMPORTANT NOTICE</p>
                  <p className="text-amber-700 text-sm">
                    PLEASE READ SECTION 15 CAREFULLY. IT CONTAINS A MANDATORY ARBITRATION PROVISION AND CLASS ACTION WAIVER THAT AFFECT YOUR RIGHTS TO RESOLVE DISPUTES WITH US.
                  </p>
                </div>
              </section>

              <hr className="border-gray-100 my-8" />

              <section>
                <h2 className="font-serif text-2xl text-ink mb-4">2. Changes to These Terms</h2>
                <p>
                  We may update these Terms from time to time. If we make material changes, we will notify you by email or by posting a prominent notice on our Site prior to the changes taking effect. Your continued use of the Services after the effective date of the revised Terms constitutes your acceptance of the changes.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl text-ink mb-4">3. Eligibility and Accounts</h2>
                <h3 className="font-bold text-ink mb-2">3.1 Eligibility</h3>
                <p className="mb-4">
                  The Services are not directed to children under the age of 13. By using the Services, you represent that you are at least 18 years of age (or the age of majority in your jurisdiction), or at least 13 years of age and reviewing these Terms with a parent or guardian who agrees to be bound by them.
                </p>
                <h3 className="font-bold text-ink mb-2">3.2 Account Registration</h3>
                <p>
                  To access certain features, including the "Vault" library, you must register for an account. You agree to provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl text-ink mb-4">4. Service Description</h2>
                <p>
                  HuePress is a SaaS web application that provides members with access to a curated library ("Vault") of digital download assets, specifically printable PDFs such as coloring pages and activities. We strive to verify the accuracy of our content but make no guarantees regarding the suitability of the materials for any specific purpose.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl text-ink mb-4">5. Subscriptions, Billing, and Cancellation</h2>
                
                <h3 className="font-bold text-ink mb-2">5.1 Subscription Plans</h3>
                <p className="mb-4">
                  We offer subscription plans (e.g., Monthly or Annual) that grant access to our digital library. Prices are clearly displayed at checkout and are subject to change with reasonable notice.
                </p>

                <h3 className="font-bold text-ink mb-2">5.2 Automatic Renewal</h3>
                <p className="mb-4">
                  <strong>UNLESS YOU CANCEL BEFORE YOUR RENEWAL DATE, YOUR SUBSCRIPTION WILL AUTOMATICALLY RENEW</strong> for the same term (monthly or annual) at the then-current rate. Payment will be charged to your provided payment method via our payment processor (Stripe).
                </p>

                <h3 className="font-bold text-ink mb-2">5.3 Cancellation</h3>
                <p className="mb-4">
                  You may cancel your subscription at any time through your account settings or the billing portal.
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-4">
                  <li><strong>Effect of Cancellation:</strong> If you cancel, your subscription will not renew, but you will continue to have access to the Services through the end of your current billing period.</li>
                </ul>

                <h3 className="font-bold text-ink mb-2">5.4 Refunds</h3>
                <p className="mb-2">
                  <strong>All payments are non-refundable.</strong> Due to the nature of our digital goods, we do not grant refunds, credits, or prorated billing for partially used subscriptions or cancelled accounts, except where explicitly required by applicable law.
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>EU Consumers:</strong> Please see Section 16 regarding the Right of Withdrawal waiver for digital content.</li>
                </ul>
              </section>

              <section>
                <h2 className="font-serif text-2xl text-ink mb-4">6. Digital Content and License</h2>
                
                <h3 className="font-bold text-ink mb-2">6.1 Standard Single-User License</h3>
                <p className="mb-2">
                  Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, non-sublicensable license to download and print the digital assets provided in the Vault for:
                </p>
                <ol className="list-decimal pl-5 space-y-2 mb-4">
                  <li><strong>Personal Use:</strong> Unlimited printing for your personal, non-commercial use at home.</li>
                  <li><strong>Professional/Classroom Use:</strong> Use by a single professional (e.g., teacher, therapist, librarian) to print copies for use directly with their own students or clients.</li>
                </ol>

                <h3 className="font-bold text-ink mb-2">6.2 Restrictions</h3>
                <p className="mb-2">You may <strong>NOT</strong>:</p>
                <ol className="list-decimal pl-5 space-y-2 mb-4">
                  <li><strong>Redistribute Digital Files:</strong> Share, email, transfer, or distribute the underlying PDF or digital files to any third party.</li>
                  <li><strong>Public Uploads:</strong> Upload our digital files to any other website, file-sharing platform, shared drive, or public server.</li>
                  <li><strong>Resale:</strong> Sell the digital files or the printed physical copies.</li>
                  <li><strong>Print-on-Demand:</strong> Use the content for commercial mass-production or print-on-demand services.</li>
                  <li><strong>Modification:</strong> Modify the digital files to remove our branding, copyright notices, or watermarks.</li>
                </ol>

                <h3 className="font-bold text-ink mb-2">6.3 Ownership</h3>
                <p className="mb-4">
                  All intellectual property rights in the Services and the digital content, including designs, text, graphics, and logos, are owned by <strong>lamaland.us LLC</strong> or our licensors.
                </p>

                <h3 className="font-bold text-ink mb-2">6.4 Content Protection Technology</h3>
                <p className="mb-4">
                  All digital content downloaded from the Services incorporates proprietary tracking technology that enables identification of the originating account. By downloading content, you acknowledge and consent to the use of such technology.
                </p>
                <p>
                  Unauthorized distribution, reproduction, or publication of our content constitutes a material breach of these Terms and may result in immediate termination of your account, as well as civil liability under applicable copyright laws, including statutory damages under 17 U.S.C. § 504.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl text-ink mb-4">7. Acceptable Use</h2>
                <p className="mb-2">You agree not to misuse the Services. Prohibited conduct includes:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Sharing your account credentials with others to bypass payment (Account Sharing).</li>
                  <li>Using any robot, spider, scraper, or other automated means to access the Services or download content in bulk.</li>
                  <li>Interfering with or disrupting the integrity or performance of the Services.</li>
                  <li>Using the Services for any illegal or unauthorized purpose.</li>
                  <li>Circumventing any content-limitations or technical protections employed by HuePress.</li>
                </ul>
              </section>

              <section>
                <h2 className="font-serif text-2xl text-ink mb-4">8. Intellectual Property and Copyright Complaints</h2>
                <p className="mb-4">
                  We respect the intellectual property rights of others. If you believe that material on our Site violates your copyright, you may send a notice to us.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <p className="font-bold mb-1">Contact for Copyright Claims:</p>
                  <address className="not-italic text-sm">
                    lamaland.us LLC (HuePress Legal Dept.)<br />
                    357, 28 Geary St STE 650<br />
                    San Francisco, CA 94108, USA<br />
                    Email: <a href="mailto:legal@huepress.co" className="text-primary hover:underline">legal@huepress.co</a>
                  </address>
                </div>
              </section>

              <section>
                <h2 className="font-serif text-2xl text-ink mb-4">9. Third-Party Services</h2>
                <p>
                  The Services may use third-party tools for authentication (Clerk) and payment processing (Stripe). Your use of these third-party services is subject to their respective terms of service and privacy policies. We are not responsible for the availability or security of these third-party platforms.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl text-ink mb-4">10. Feedback</h2>
                <p>
                  We welcome feedback, comments, and suggestions for improvements ("Feedback"). You acknowledge and agree that any Feedback you provide is non-confidential and we shall be entitled to the unrestricted use and dissemination of this Feedback for any purpose, commercial or otherwise, without acknowledgment or compensation to you.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl text-ink mb-4">11. Disclaimers</h2>
                <p className="uppercase text-sm font-semibold tracking-wide bg-gray-50 p-3 rounded mb-2 border border-gray-100">
                  The Services and Digital Content are provided on an "AS IS" and "AS AVAILABLE" basis.
                </p>
                <p>
                  TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT GUARANTEE THAT THE SERVICES WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl text-ink mb-4">12. Limitation of Liability</h2>
                <p className="uppercase text-sm font-semibold tracking-wide bg-gray-50 p-3 rounded mb-2 border border-gray-100">
                  Limitation of Damages
                </p>
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, <strong>LAMALAND.US LLC</strong> SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES. IN NO EVENT SHALL OUR AGGREGATE LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICES EXCEED THE GREATER OF (A) <strong>ONE HUNDRED U.S. DOLLARS ($100.00)</strong> OR (B) THE AMOUNTS PAID BY YOU TO US FOR THE SERVICES IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl text-ink mb-4">13. Indemnification</h2>
                <p>
                  You agree to defend, indemnify, and hold harmless <strong>lamaland.us LLC</strong> and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable legal fees, arising out of or in any way connected with your access to or use of the Services or your violation of these Terms.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl text-ink mb-4">14. Termination</h2>
                <p>
                  We may terminate or suspend your account and access to the Services immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach these Terms. Upon termination, your right to use the Services will cease immediately.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl text-ink mb-4">15. Governing Law and Dispute Resolution</h2>
                
                <h3 className="font-bold text-ink mb-2">15.1 Governing Law</h3>
                <p className="mb-4">
                  These Terms shall be governed by and construed in accordance with the laws of the <strong>State of California</strong>, without regard to its conflict of law provisions. Venue for any disputes not subject to arbitration shall be exclusively in the state or federal courts located in <strong>San Francisco County, California</strong>.
                </p>

                <h3 className="font-bold text-ink mb-2">15.2 Mandatory Binding Arbitration</h3>
                <div className="bg-amber-50 p-4 rounded-md border border-amber-200 mb-4">
                  <p className="font-bold text-amber-900 mb-2">PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR RIGHTS.</p>
                  <p className="text-amber-800 text-sm">
                    Any dispute, claim, or controversy arising out of or relating to these Terms or the breach, termination, enforcement, interpretation, or validity thereof, or the use of the Services (collectively, "Disputes") shall be determined exclusively by binding individual arbitration and not in a court of law. The arbitration shall be administered by the <strong>American Arbitration Association (AAA)</strong> in accordance with its Consumer Arbitration Rules. The arbitration shall be conducted in San Francisco, California.
                  </p>
                </div>

                <h3 className="font-bold text-ink mb-2">15.3 Class Action Waiver</h3>
                <p className="font-medium">
                  YOU AND WE AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR OUR INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING.
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Unless both you and we agree otherwise, the arbitrator may not consolidate more than one person's claims and may not otherwise preside over any form of a representative or class proceeding.
                </p>
              </section>

              <section>
                <h2 className="font-serif text-2xl text-ink mb-4">16. EU/EEA Consumer Terms</h2>
                <p className="mb-2">If you are a consumer located in the European Union or European Economic Area (EEA), the following additional terms apply to you:</p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    <strong>Right of Withdrawal Waiver:</strong> You generally have a statutory right to withdraw from a distance contract within 14 days. However, because our Services provide immediate access to digital content that is not supplied on a tangible medium, <strong>you expressly consent to the immediate performance of the contract and acknowledge that you strictly lose your right of withdrawal once access to the digital content creates a started performance.</strong>
                  </li>
                  <li><strong>Legal Guarantee:</strong> You are entitled to a legal guarantee of conformity for goods and digital services under your local consumer laws.</li>
                  <li><strong>ODR Platform:</strong> The European Commission provides a platform for Online Dispute Resolution (ODR), which can be accessed at <a href="http://ec.europa.eu/consumers/odr" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">http://ec.europa.eu/consumers/odr</a>.</li>
                </ol>
              </section>

              <section>
                <h2 className="font-serif text-2xl text-ink mb-4">17. Contact Us</h2>
                <p className="mb-2">If you have any questions about these Terms, please contact us at:</p>
                <address className="not-italic bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <strong>lamaland.us LLC (HuePress Legal Dept.)</strong><br />
                  357, 28 Geary St STE 650<br />
                  San Francisco, CA 94108, USA<br />
                  Email: <a href="mailto:privacy@huepress.co" className="text-primary hover:underline">privacy@huepress.co</a>
                </address>
              </section>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

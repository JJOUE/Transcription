"use client";

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send message');
      }

      toast({
        title: "Message sent successfully!",
        description: "We'll get back to you within 24 hours.",
      });

      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      toast({
        title: "Error sending message",
        description: error instanceof Error ? error.message : "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section 
        className="relative text-white py-24"
        style={{
          backgroundImage: "url('/bg_1.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#003366]/80 to-[#2c3e50]/80"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Get in Touch
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Have questions about transcription, audio instructions for document preparation, copy typing,
              handwriting transcription, or document preparation? We&apos;re here to help.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-[#003366]">
                  Send us a Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Name *
                      </label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                      Subject *
                    </label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="How can we help you?"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us more about your needs..."
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#003366] hover:bg-[#002244] text-white"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <div className="space-y-8">
              <Card className="border border-[#b29dd9] shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-[#003366] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#003366] mb-2">
                        Email Support
                      </h3>
                      <p className="text-gray-600 mb-2">
                        Get help with your account, billing, uploads, or a service question.
                      </p>
                      <a
                        href="mailto:jennifer@talktotext.ca"
                        className="text-[#b29dd9] hover:text-[#9d87c7] font-medium"
                      >
                        jennifer@talktotext.ca
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-[#b29dd9] shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-[#003366] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#003366] mb-2">
                        Phone Support
                      </h3>
                      <p className="text-gray-600 mb-2">
                        Speak directly with our support team for urgent matters.
                      </p>
                      <a
                        href="tel:+12894993536"
                        className="text-[#b29dd9] hover:text-[#9d87c7] font-medium"
                      >
                        (289) 499-3536
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-[#b29dd9] shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-[#003366] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#003366] mb-2">
                        Business Hours
                      </h3>
                      <div className="text-gray-600 space-y-1">
                        <p>Monday - Friday: 9:00 AM - 5:00 PM EST</p>
                        <p>Saturday - Sunday: Closed</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-[#b29dd9] shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-[#003366] rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#003366] mb-2">
                        Office Location
                      </h3>
                      <div className="text-gray-600">
                        <p>Brampton, ON</p>
                        <p>Canada</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-[#b29dd9] shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-[#25D366] rounded-lg flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#003366] mb-2">
                        WhatsApp Support
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Quick questions? Chat with us on WhatsApp for instant support.
                      </p>
                      <a
                        href="https://wa.me/12894993536"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-6 py-3 bg-[#25D366] hover:bg-[#22c55e] text-white font-medium rounded-lg transition-colors"
                      >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        Chat on WhatsApp
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Common Questions
            </h2>
            <p className="text-xl text-gray-600">
              Quick answers to frequently asked questions
            </p>
          </div>

          <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-[#003366] mb-2">
                How quickly can I get my transcription?
              </h3>
              <p className="text-gray-600">
                AI transcription can be completed quickly. Hybrid review, human transcription,
                copy typing, handwriting transcription, and document preparation depend on the
                file length, clarity, and service requested.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-[#003366] mb-2">
                What if I need a rush job?
              </h3>
              <p className="text-gray-600">
                We offer priority processing for urgent requests. Contact our support team 
                to discuss rush options and pricing.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-[#003366] mb-2">
                Do you offer volume discounts?
              </h3>
              <p className="text-gray-600">
                Yes! Our Enterprise packages already include significant savings, and we 
                offer custom pricing for high-volume clients. Contact us to discuss your needs.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-[#003366] mb-2">
                Is my data secure and confidential?
              </h3>
              <p className="text-gray-600">
                Files are handled through secure upload and download workflows with a focus on
                confidentiality. Completed files are active for 30 days, may be archived after
                30 days, and may be deleted after 90 days unless a retention hold applies.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default ContactPage;
export { ContactPage };

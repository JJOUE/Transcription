'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

const serviceOptions = [
  'AI Transcription',
  'Hybrid Transcription',
  'Human Transcription',
  'Transcript Workspace',
  'Document Workspace',
  'Copy Typing',
  'Handwriting Transcription',
  'Audio Instructions for Document Preparation',
  'Other',
];

const ratingOptions = ['5 stars', '4 stars', '3 stars', '2 stars', '1 star'];

export function FeedbackForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    serviceUsed: 'Transcript Workspace',
    rating: '5 stars',
    message: '',
    contactPermission: false,
    publicTestimonialPermission: false,
    website: '',
  });

  const updateField = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to send feedback right now.');
      }

      setIsSubmitted(true);
      setFormData({
        name: '',
        email: '',
        serviceUsed: 'Transcript Workspace',
        rating: '5 stars',
        message: '',
        contactPermission: false,
        publicTestimonialPermission: false,
        website: '',
      });

      toast({
        title: 'Feedback sent',
        description: 'Thank you for your feedback. Your message has been sent privately to Talk to Text Canada.',
      });
    } catch (error) {
      toast({
        title: 'Feedback was not sent',
        description:
          error instanceof Error
            ? error.message
            : 'Please try again or contact us directly.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl font-bold text-[#003366]">
            <MessageSquare className="h-6 w-6 text-[#b29dd9]" />
            Private Feedback Form
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isSubmitted && (
            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <p>
                  Thank you for your feedback. Your message has been sent privately to Talk to Text
                  Canada.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="hidden">
              <label htmlFor="website">Website</label>
              <Input
                id="website"
                name="website"
                type="text"
                value={formData.website}
                onChange={(event) => updateField('website', event.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <Input
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="serviceUsed" className="mb-2 block text-sm font-medium text-gray-700">
                  Service used *
                </label>
                <select
                  id="serviceUsed"
                  name="serviceUsed"
                  required
                  value={formData.serviceUsed}
                  onChange={(event) => updateField('serviceUsed', event.target.value)}
                  className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-black shadow-xs outline-none focus-visible:border-[#003366] focus-visible:ring-2 focus-visible:ring-[#b29dd9]/40"
                >
                  {serviceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="rating" className="mb-2 block text-sm font-medium text-gray-700">
                  Rating *
                </label>
                <select
                  id="rating"
                  name="rating"
                  required
                  value={formData.rating}
                  onChange={(event) => updateField('rating', event.target.value)}
                  className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-black shadow-xs outline-none focus-visible:border-[#003366] focus-visible:ring-2 focus-visible:ring-[#b29dd9]/40"
                >
                  {ratingOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="message" className="mb-2 block text-sm font-medium text-gray-700">
                Feedback message *
              </label>
              <Textarea
                id="message"
                name="message"
                required
                rows={7}
                value={formData.message}
                onChange={(event) => updateField('message', event.target.value)}
                placeholder="Tell us about your experience. Please do not include confidential or sensitive details."
              />
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <p>
                  Please do not include confidential details, legal information, medical
                  information, passwords, case numbers, or sensitive personal information in your
                  feedback.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <Checkbox
                  checked={formData.contactPermission}
                  onCheckedChange={(checked) => updateField('contactPermission', checked === true)}
                  className="mt-1"
                />
                <span>I give Talk to Text Canada permission to contact me about this feedback.</span>
              </label>

              <label className="flex items-start gap-3 text-sm text-gray-700">
                <Checkbox
                  checked={formData.publicTestimonialPermission}
                  onCheckedChange={(checked) =>
                    updateField('publicTestimonialPermission', checked === true)
                  }
                  className="mt-1"
                />
                <span>
                  I give Talk to Text Canada permission to consider this feedback for use as a
                  public testimonial. I understand it may be shortened or edited for clarity and
                  will not be published automatically.
                </span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#003366] text-white hover:bg-[#002244]"
            >
              {isSubmitting ? 'Sending feedback...' : 'Send Private Feedback'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <aside className="space-y-6">
        <Card className="border border-[#b29dd9] shadow-lg">
          <CardContent className="p-6">
            <h2 className="mb-3 text-xl font-bold text-[#003366]">Private by default</h2>
            <p className="text-sm text-gray-700">
              Feedback submitted here is sent privately to Talk to Text Canada. It does not appear
              on the website and is not published automatically.
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-lg">
          <CardContent className="p-6">
            <h2 className="mb-3 text-xl font-bold text-[#003366]">Need help instead?</h2>
            <p className="mb-4 text-sm text-gray-700">
              If your message is about an account, upload, billing, or project question, the contact
              page may be a better fit.
            </p>
            <div className="flex flex-col gap-3">
              <Button asChild variant="outline" className="border-[#003366] text-[#003366]">
                <Link href="/contact">Contact Us</Link>
              </Button>
              <Button asChild variant="outline" className="border-[#003366] text-[#003366]">
                <Link href="/guide">Read the Guide</Link>
              </Button>
              <Button asChild variant="outline" className="border-[#003366] text-[#003366]">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

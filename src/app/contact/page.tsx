import Link from 'next/link'
import { SiteButton, SiteField, SiteHeader, SiteInput, SitePage, SitePanel, SiteTextarea } from '@/components/site'

const REQUIRED_MARK = ' *'

export default function ContactPage() {
  return (
    <SitePage width="md" className="gap-8 lg:px-8">
      <SiteHeader
        title="Une question ? Une demande ?"
        eyebrow="Formulaire HabbOne"
        imageSrc="/img/info.png"
        description={<span><span className="font-semibold">*</span> Indique une question obligatoire</span>}
      />

      <SitePanel className="px-6 py-8">
        <form className="space-y-6" noValidate>
          <Field
            label="Adresse e-mail"
            name="email"
            type="email"
            placeholder="exemple@habbo.fr"
            required
          />
          <Field
            label="Votre Pseudo Habbo"
            name="pseudo"
            type="text"
            placeholder="Pseudo Habbo"
            required
          />
          <Field
            label="Sujet"
            name="subject"
            type="text"
            placeholder="Sujet de votre demande"
            required
          />
          <Field
            label="Description"
            name="description"
            as="textarea"
            placeholder="Décrivez votre question ou votre besoin..."
            required
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[color:var(--foreground)]/55">
              Nous vous répondrons par e-mail dans les meilleurs délais.
            </p>
            <SiteButton type="submit" className="text-[12px]">
              Envoyer ma demande
            </SiteButton>
          </div>
        </form>
      </SitePanel>

      <SitePanel as="div" className="px-6 py-5 text-sm text-[#BEBECE]/80">
        Besoin d&apos;une réponse immédiate ? Consulte aussi notre{' '}
        <Link href="/forum" className="font-semibold text-white hover:text-[#25B1FF]">
          forum communautaire
        </Link>{' '}
        ou rejoins notre{' '}
        <a
          href="https://discord.gg/zCFvdHsAry"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sky-400 hover:text-sky-300"
        >
          serveur Discord
        </a>.
      </SitePanel>
    </SitePage>
  )
}

type FieldProps =
  | ({
      label: string
      name: string
      placeholder?: string
      required?: boolean
      className?: string
    } & (
      | { type?: 'text' | 'email'; as?: 'input' }
      | { type?: never; as: 'textarea' }
    ))

function Field(props: FieldProps) {
  const { label, name, placeholder, required, className } = props
  const isTextArea = props.as === 'textarea'

  return (
    <SiteField label={label} required={required} className={className}>
      {isTextArea ? (
        <SiteTextarea id={name} name={name} placeholder={placeholder} required={required} rows={6} />
      ) : (
        <SiteInput id={name} name={name} placeholder={placeholder} required={required} type={props.type ?? 'text'} />
      )}
    </SiteField>
  )
}

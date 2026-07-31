import { Link } from "react-router";

/**
 * Rustige verwijzing naar de privacyverklaring en de voorwaarden, bedoeld voor
 * de plekken waar iemand een account aanmaakt (AuthPage, AcceptInvitePage) —
 * dat is het moment waarop de instemming daadwerkelijk plaatsvindt.
 *
 * Bewust `Link` en geen `navigate`-knop: dit hoort een echte, deelbare,
 * te-openen-in-nieuw-tabblad link te zijn. Beide routes staan buiten de
 * auth-gate (zie App.tsx), dus ze werken hier ook als je nog niet ingelogd bent.
 */
export function JuridischFooter({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-xs text-muted-foreground leading-relaxed ${className}`}>
      Door verder te gaan ga je akkoord met de{" "}
      <Link to="/voorwaarden" className="text-foreground underline underline-offset-2 focus-ring rounded">voorwaarden</Link>
      {" "}en de{" "}
      <Link to="/privacy" className="text-foreground underline underline-offset-2 focus-ring rounded">privacyverklaring</Link>.
    </p>
  );
}

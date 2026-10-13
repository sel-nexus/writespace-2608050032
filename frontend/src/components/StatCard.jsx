/** Present a labeled activity count using the existing light tokens. */
import PropTypes from "prop-types";
const accents = {
  primary: "border-primary-500",
  secondary: "border-secondary-500",
  writers: "border-teal-500",
  posts: "border-pink-500",
};

/** Render one accessible definition-list statistic.
 * Args: label {string} Count meaning. value {number} Actual count. accent {string} Border variant.
 * Returns: {JSX.Element} Paired label and tabular number.
 */
export function StatCard({ label, value, accent = "primary" }) {
  return (
    <div
      className={`rounded-card border border-border border-t-4 bg-surface p-6 ${accents[accent]}`}
    >
      <dt className="text-sm font-semibold text-foreground-muted">{label}</dt>
      <dd className="mt-3 text-4xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}
StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  accent: PropTypes.oneOf(Object.keys(accents)),
};

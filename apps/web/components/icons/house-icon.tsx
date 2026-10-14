import type { SVGProps } from 'react';

export function HouseIcon(props: SVGProps<SVGSVGElement>): React.JSX.Element {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath="url(#house-clip)">
        <path
          d="M1.56152 3.31114L5.27974 0.419189L8.99796 3.31114V7.85563C8.99796 8.07477 8.91091 8.28494 8.75596 8.43989C8.601 8.59485 8.39083 8.6819 8.17169 8.6819H2.38779C2.16865 8.6819 1.95849 8.59485 1.80353 8.43989C1.64858 8.28494 1.56152 8.07477 1.56152 7.85563V3.31114Z"
          stroke="currentColor"
          strokeWidth="0.743644"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4.04053 8.68214V4.55078H6.51934V8.68214"
          stroke="currentColor"
          strokeWidth="0.743644"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="house-clip">
          <rect width="9.91525" height="9.91525" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
